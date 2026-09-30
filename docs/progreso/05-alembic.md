# 05 · Migraciones con Alembic

**Fecha:** 30/09/2026 · **Decisión:** [ADR-014](../decisions/014-migraciones-con-alembic.md)

## Qué se hizo

Se sustituyó el script propio de migraciones (`scripts/migrate.ts`) por **Alembic**, la herramienta estándar de Python, manteniendo el SQL escrito a mano. Se hizo con TDD: primero los tests, después el código.

## Por qué

- Alembic permite **deshacer** migraciones (`downgrade`), cosa que el script propio no hacía.
- Es una herramienta conocida: no hay que leer código propio para fiarse de cómo se aplica el esquema.
- Se usa solo como gestor de versiones: cada migración es SQL dentro de `op.execute(...)`, así que se conserva lo decidido en ADR-002.

Coste aceptado: un segundo lenguaje (Python) en el repositorio y una segunda imagen de Docker.

## Cómo funciona

1. `db/alembic.ini` le dice a Alembic dónde están las migraciones.
2. `db/env.py` lee `DATABASE_URL`, abre una conexión y aplica en una transacción las migraciones que falten.
3. Cada migración (`db/versions/0001_init.py`) tiene `upgrade()` (crear) y `downgrade()` (deshacer).
4. Alembic apunta la versión aplicada en la tabla `alembic_version`.

En local se ejecuta con `npm run db:migrate`, que usa `uv` para crear al vuelo un entorno de Python con Alembic, sin instalar nada a mano. En la VPS, el servicio `migrate` de Docker Compose usa su propia imagen (`db/Dockerfile`) y la app solo arranca cuando las migraciones terminan bien.

## Evidencia TDD

| Paso | Qué se ejecutó | Resultado |
|---|---|---|
| RED | `pytest db/tests` con los tests escritos y sin configuración de Alembic | 3 fallos: `No 'script_location' key found in configuration` (falta justo lo que se iba a implementar) |
| GREEN | Mismo comando tras añadir `alembic.ini`, `env.py` y `0001_init.py` | 3 pasan |
| Integración | `npm test`, `tsc`, imagen `db/Dockerfile` contra el Postgres local (dos veces) | Todo pasa; la segunda ejecución no cambia nada |
| Despliegue | `infra/deploy.sh` + `SELECT version_num FROM alembic_version` en la VPS | `0001`; `/v1/health` → `ok` |

Qué garantizan los tests (`db/tests/test_migrations.py`):

| # | Garantía |
|---|---|
| 1 | `upgrade head` crea las seis tablas |
| 2 | Repetir `upgrade head` no cambia nada |
| 3 | `downgrade base` borra todas las tablas y un nuevo `upgrade head` las recrea |

## Problemas encontrados

| Problema | Causa | Solución |
|---|---|---|
| El primer despliegue no aplicó Alembic y no dio error visible | `infra/deploy.sh` había perdido el permiso de ejecución: con `core.fileMode=false` git no guardaba el bit `+x`, y al cambiar de rama el archivo se recreó sin él | Registrar el bit en git con `git update-index --chmod=+x` |
| La BD de la VPS tenía las tablas creadas por el script antiguo | Alembic no sabía que ya existían | Como estaba vacía (0 filas), se reinició el esquema y Alembic lo creó de cero |

## Commits

- `01517a2` test(db): add Alembic migration tests (RED)
- `57d6ee4` feat(db): migrate schema with Alembic (GREEN)
- `96cca6d` docs(adr): add ADR-014
- `1539687` fix(infra): record the executable bit of the infra scripts in git
