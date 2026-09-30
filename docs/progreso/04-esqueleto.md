# 04 · Esqueleto desplegado de punta a punta

**Fecha:** 30/09/2026 · **Fase del calendario:** 3

## Qué se hizo

Se desplegó en la VPS una versión mínima pero completa del sistema nuevo: base de datos PostgreSQL con el esquema definitivo, migraciones automáticas, un endpoint `GET /v1/health` servido por HTTPS con certificado real, y CI en GitHub. Todavía no hay lógica de pagos: el objetivo era comprobar que **todas las piezas encajan** antes de programarla.

Resultado: `https://instanta.scuda.es/v1/health` → `200 {"status":"ok","database":"ok"}`.

## Por qué primero el esqueleto

Los problemas de despliegue (certificados, redes de Docker, variables de entorno, paquetes que faltan) aparecen siempre. Mejor encontrarlos ahora, con una sola ruta, que la semana de la entrega con toda la aplicación encima. De hecho apareció uno (ver *Problemas*).

## Piezas y por qué cada una

| Pieza | Archivo | Por qué así |
|---|---|---|
| Conexión a la BD | `lib/db.ts` | Driver `postgres` sin ORM (ADR-002). Convierte los importes `NUMERIC` a `bigint` de JS para no usar nunca `number` con dinero |
| Ids | `lib/ids.ts` | Prefijo + 128 bits aleatorios en hexadecimal (`pi_…`, `req_…`). Una función de 3 líneas |
| Esquema | `db/migrations/001_init.sql` | Las reglas de los ADR escritas como restricciones de la BD (ver abajo) |
| Migraciones | `scripts/migrate.ts` | ~25 líneas: aplica en orden los `.sql` pendientes, cada uno en una transacción, y lo anota en `schema_migrations` |
| Health check | `src/app/v1/health/route.ts` | Consulta `SELECT 1` y devuelve la cabecera `Request-Id` definida en la spec |
| Contenedores | `Dockerfile`, `compose.yaml` | Una sola imagen para la app y las migraciones. Compose arranca en orden: Postgres sano → migraciones terminadas → app → Caddy |
| HTTPS | `Caddyfile` | 3 líneas. Caddy pide y renueva el certificado de Let's Encrypt solo. Sin logs de acceso, porque las URLs del checkout llevarán el `client_secret` |
| Despliegue | `infra/deploy.sh` | `rsync` del código a la VPS + `docker compose up --build`. Sin registro de imágenes ni pipeline de CD: no hacen falta con un solo servidor |
| CI | `.github/workflows/ci.yml` | En cada push: `tsc`, `lint` y tests contra un Postgres real |

## El esquema: reglas que hace cumplir la base de datos

Lo más importante de esta fase. Aunque el código tuviera un fallo, la base de datos rechaza estados imposibles:

| Restricción | Qué impide | Origen |
|---|---|---|
| `tx_hash UNIQUE` y en minúsculas | Que una transacción pague dos pedidos, también escribiendo el hash con otras mayúsculas | ADR-004, T2 |
| `status IN (…)` | Estados inventados | ADR-007 |
| `tx_hash` presente ⇔ estado `processing`, `succeeded` o `failed` | Un pago "pagado" sin transacción | ADR-007 |
| `succeeded_at` presente ⇔ `succeeded`; `failure_code` presente ⇔ `failed` | Datos incoherentes con el estado | ADR-007 |
| `currency = 'eth'` ⇔ `token_address` nulo | Un pago en ETH con contrato de token, o uno en USDC sin él | ADR-013 |
| `amount > 0`, direcciones con formato `0x` + 40 hex | Importes o direcciones inválidos | ADR-007 |
| `UNIQUE (merchant_id, livemode)` en webhooks | Más de un endpoint por comercio y modo | ADR-009 |

Los importes son `NUMERIC(78,0)` y no `BIGINT` porque ETH tiene 18 decimales y un `BIGINT` solo llega a ~9,2 ETH (ADR-013).

## Tests

Dos tests con `node:test` (sin dependencias):

1. Aplicar las migraciones dos veces deja el mismo resultado (el script es idempotente).
2. Un `tx_hash` en mayúsculas es rechazado por la base de datos: demuestra el control T2 a nivel de datos.

## Problemas encontrados

| Problema | Causa | Solución |
|---|---|---|
| El contenedor de migraciones fallaba con `Cannot find package 'postgres'` | Next.js mete las dependencias dentro de su propio bundle; la salida `standalone` no incluye `node_modules/postgres` para scripts externos | Copiar la carpeta del paquete en el `Dockerfile` (no tiene dependencias propias) |
| `docker compose` local rechazaba `env_file` en forma de objeto | Versión de Compose más antigua en el Mac | Usar la forma simple `env_file: .env` |
| Node avisaba de que no sabía si los `.ts` eran módulos ES | Faltaba `"type": "module"` en `package.json` | Añadirlo; el build de Next.js sigue funcionando |

## Decisiones menores tomadas por el camino

- **PostgreSQL 18** en lugar del 16 que decía el ADR-002: es la versión estable actual.
- **Node 24 ejecuta los scripts TypeScript directamente** (sin compilar), gracias a `allowImportingTsExtensions` en `tsconfig.json`. Menos piezas: no hace falta `tsx` ni un paso de build para los scripts.
- **El worker todavía no existe.** No tiene nada que hacer hasta la fase de verificación; se añadirá entonces, no antes.
- **Postgres publica su puerto solo en `127.0.0.1`**: sirve para desarrollo local y en la VPS no es accesible desde internet (Docker se saltaría el cortafuegos si se publicara en todas las interfaces).
- El `.env` de la VPS se generó con una contraseña aleatoria de Postgres y permisos `600`; no está en el repositorio.

## Commits

- `71c5a4b` feat(db): add PostgreSQL schema, migration runner and first tests
- `63364eb` feat(api): add GET /v1/health with database check and Request-Id
- `c33e6b5` build: containerise app with Postgres and Caddy (ADR-003)
- `241e8cd` ci: typecheck, lint and tests against Postgres on every push
- `f82d5dc` chore(infra): add rsync + docker compose deploy script
- `c672aa6` fix(build): ship the postgres package for the migrate job
