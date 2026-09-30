# ADR-002: Persistencia — PostgreSQL con SQL escrito a mano en vez de Convex

**Fecha:** 30 de septiembre de 2026  
**Estado:** Aceptada (30/09/2026; se usa PostgreSQL 18). Las migraciones pasan a Alembic: [ADR-014](014-migraciones-con-alembic.md)  
**Contexto:** Pasar de un prototipo sobre Convex a un backend propio con API pública tipo Stripe

---

## Problema

El prototipo guarda todo en Convex. Funciona para una demo, pero tiene cuatro problemas de cara al producto y al TFG:

1. **Las reglas de integridad viven en código de aplicación.** Nada impide a nivel de datos que dos pagos usen el mismo `txHash` o que un pago tenga un estado inválido.
2. **Las mutations son públicas por defecto.** `updatePayment` acepta `status: "confirmed"` desde el navegador; cualquiera puede marcar un pago como pagado.
3. **Es un servicio propietario.** El modelo de datos y las consultas no son transferibles ni se corresponden con lo que se enseña en el grado (modelo relacional, SQL, transacciones).
4. **Una API REST pública es incómoda sobre Convex.** Se puede con `httpAction`, pero la API sería una capa añadida encima de otra abstracción.

## Opciones Evaluadas

### Opción A: Mantener Convex y exponer REST con `httpAction` (descartada)

**Por qué se descartó:**

- Resuelve la API, pero no la integridad: seguirían sin existir `UNIQUE`, `CHECK` ni transacciones explícitas.
- En la memoria habría que justificar una base de datos documental propietaria para un sistema de pagos, donde la consistencia es el requisito principal.

### Opción B: PostgreSQL + ORM (Prisma/Drizzle) (descartada)

**Por qué se descartó:**

- Añade una dependencia grande y un lenguaje de esquema propio para un modelo de 5 tablas.
- Oculta el SQL, que es precisamente lo que el TFG quiere enseñar y defender.

### Opción C: PostgreSQL + SQL a mano con el driver `postgres` (elegida)

**Por qué se eligió:**

- **La base de datos hace cumplir las reglas:** `UNIQUE(tx_hash)` impide reutilizar una transacción; `CHECK (status IN (...))` impide estados inválidos; las transiciones de estado son `UPDATE ... WHERE status = <esperado>` (ver ADR-007).
- **Transacciones reales:** el cambio de estado y el evento de webhook se escriben juntos o no se escriben (ver ADR-009).
- **Postgres también sirve de cola** (`FOR UPDATE SKIP LOCKED`), así que no hace falta Redis.
- El driver [`postgres`](https://www.npmjs.com/package/postgres) usa *tagged templates*, que parametrizan las consultas y evitan la inyección SQL sin necesidad de un ORM.
- Es portable: corre igual en Docker local, en la VM o en Cloud SQL.

## Diseño

**Migraciones:** archivos `.sql` numerados en `db/migrations/` (`001_init.sql`, `002_...`), una tabla `schema_migrations(version, applied_at)` y un script de ~20 líneas que aplica en orden las que falten, cada una dentro de una transacción. Solo hacia delante; no hay *down migrations* (ponytail: si hace falta deshacer, se escribe otra migración).

**Tablas iniciales (5):**

| Tabla | Contenido |
|---|---|
| `merchants` | `id`, `clerk_user_id UNIQUE`, `email`, `name`, `payout_address`, `created_at` |
| `api_keys` | `id`, `merchant_id`, `livemode`, `prefix` (visible, p. ej. `sk_test_ab12`), `key_hash UNIQUE`, `created_at`, `revoked_at` |
| `payment_intents` | ver ADR-007 |
| `events` | ver ADR-009 (hace de outbox y de registro de entregas) |
| `webhook_endpoints` | `id`, `merchant_id`, `url`, `secret`, `livemode`, `enabled` |

Los identificadores públicos llevan prefijo (`pi_`, `evt_`, `we_`), generados con `crypto.randomBytes`. Nunca se exponen los ids internos.

**Acceso a datos:** un único módulo `lib/db.ts` exporta la conexión. Las consultas se escriben junto al código que las usa; no hay capa de repositorios (ponytail: se añade si una misma consulta aparece en tres sitios).

## Consecuencias

- Se pierde la reactividad en tiempo real de Convex. El checkout y el dashboard consultarán el estado cada 2–3 s (ver ADR-010 y ADR-012). Si se necesita tiempo real de verdad, *Server-Sent Events* con `LISTEN/NOTIFY` de Postgres.
- Convex se retira al final de la migración, no antes: el código nuevo se construye al lado y luego se borra el viejo. No se corrigen bugs en el código de Convex.
- [`docs/archive/hacia_server_propio.md`](../archive/hacia_server_propio.md) concluía que DDD/CQRS no compensaban; esta decisión es coherente con eso: backend propio, pero sin capas formales.

## Decisión

Sustituir Convex por PostgreSQL 16, con SQL escrito a mano, el driver `postgres` y migraciones en archivos `.sql`. Sin ORM.
