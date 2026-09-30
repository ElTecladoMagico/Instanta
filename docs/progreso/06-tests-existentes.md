# 06 · Tests de todo lo existente (y un fallo encontrado)

**Fecha:** 30/09/2026

## Qué se hizo

Se escribieron tests para cada pieza que ya existía: generación de ids, `GET /v1/health` (con la base de datos disponible y caída) y **cada regla del esquema**, probada en positivo (un dato válido se guarda) y en negativo (uno inválido se rechaza). Al hacerlo apareció un fallo real, que se corrigió siguiendo TDD.

## Por qué

Hasta ahora las reglas del esquema estaban escritas pero no demostradas. Un test por regla convierte cada fila del modelo de amenazas y de la máquina de estados en una comprobación automática que la CI repite en cada push. Además, en código que ya existe, escribir los tests es la forma de descubrir si hace lo que creíamos; y aquí no lo hacía.

## El fallo encontrado

**Síntoma:** guardar un pago de 1 000 000 ETH (10²⁴ wei) fallaba con `value "1000000000000000000000000" is out of range for type bigint`.

**Causa:** la columna es `NUMERIC(78,0)` (ADR-013), pero el driver `postgres` envía siempre los `bigint` de JavaScript con el tipo `int8` de Postgres, que no pasa de 2⁶³ ≈ 9,2 ETH en wei. No es configurable: está fijado en el código del driver (`inferType`).

**Consecuencia si no se hubiera visto:** cualquier pago en ETH por encima de ~9,2 ETH fallaría al guardarse, y solo en ETH, porque los importes en USDC son mucho más pequeños.

**Solución:** `lib/db.ts` exporta `numeric(importe)`, que envía el valor con el tipo `NUMERIC`. Todo el código que escriba importes debe usarla; el test de 10²⁴ wei lo comprueba.

## Evidencia TDD

| Paso | Comando | Resultado |
|---|---|---|
| RED | `npm test` con los tests nuevos | 22 pasan, 1 falla: `out of range for type bigint` |
| GREEN | `npm test` tras añadir `numeric()` | 23 de 23 pasan |
| Cobertura | `npm run test:coverage` | `lib/db.ts`, `lib/ids.ts` y `v1/health/route.ts`: 100 % de líneas, ramas y funciones |

## Qué garantizan los tests

| Archivo | Garantías |
|---|---|
| `test/ids.test.ts` | Formato `prefijo_` + 32 hex (128 bits); 10 000 ids sin repetidos |
| `test/health.test.ts` | Con BD: `200`, `{"status":"ok","database":"ok"}` y `Request-Id` válido |
| `test/health-down.test.ts` | Sin BD: `503` con error `api_error / service_unavailable` y `Request-Id` |
| `test/schema.test.ts` | Pagos válidos en USDC y en ETH se guardan; importes de 10²⁴ wei sin pérdida de precisión; 13 datos inválidos rechazados (importe cero, moneda o red desconocida, ETH con token, USDC sin token, dirección mal formada, estado inventado, cada incoherencia entre estado y `tx_hash` / `succeeded_at` / `failure_code`, `tx_hash` en mayúsculas); misma transacción en dos pagos rechazada; tipo de evento inventado rechazado; segundo endpoint de webhook rechazado |
| `db/tests/test_migrations.py` | Ver entrada 05 |

**Técnica para probar "sin base de datos":** `node --test` ejecuta cada archivo en su propio proceso, así que `health-down.test.ts` apunta `DATABASE_URL` a un puerto cerrado antes de cargar la ruta. No hizo falta cambiar el código de producción para poder probarlo.

**Cómo se reconoce cada error:** por el código estándar de Postgres (`23514` = viola un `CHECK`, `23505` = viola un `UNIQUE`) y no por el texto del mensaje, que puede cambiar.

## Commits

- test: cover ids, health (db up/down) and every schema rule (RED)
- fix(db): send amounts as NUMERIC so wei values above 2^63 fit (GREEN)
- ci: report test coverage for lib/ and /v1
