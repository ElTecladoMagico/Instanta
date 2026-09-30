# ADR-014: Migraciones de base de datos con Alembic

**Fecha:** 30 de septiembre de 2026  
**Estado:** Aceptada  
**Contexto:** Sustituye al script propio de migraciones de ADR-002

---

## Problema

ADR-002 aplicaba las migraciones con un script propio de ~25 líneas (`scripts/migrate.ts`): archivos `.sql` numerados, una tabla `schema_migrations` y solo hacia delante. Funcionaba, pero:

- No permitía **deshacer** una migración (`downgrade`).
- Era una herramienta inventada para el proyecto: un evaluador tendría que leerla para fiarse de ella.
- El autor prefiere una herramienta estándar y conocida.

## Opciones Evaluadas

### Opción A: Mantener el script propio (descartada)

Es lo más corto, pero reinventa algo que ya existe y no permite volver atrás.

### Opción B: Herramienta del ecosistema Node (node-pg-migrate, dbmate) (descartada)

Mantendría un solo lenguaje, pero el autor pidió expresamente Alembic.

### Opción C: Alembic con SQL escrito a mano (elegida)

[Alembic](https://alembic.sqlalchemy.org/) es la herramienta de migraciones de referencia en Python. Se usa **solo como gestor de versiones**: cada migración es SQL escrito a mano dentro de `op.execute(...)`, sin modelos de SQLAlchemy ni autogeneración. Así se mantiene lo que decidió ADR-002 (el SQL se ve y se defiende) y se gana el control de versiones, el `downgrade` y una herramienta estándar.

## Diseño

```
db/
├── alembic.ini          # solo script_location
├── env.py               # conecta a DATABASE_URL y aplica las migraciones en una transacción
├── script.py.mako       # plantilla para `alembic revision -m "…"`
├── versions/
│   └── 0001_init.py     # upgrade(): CREATE TABLE …   downgrade(): DROP TABLE …
├── tests/test_migrations.py
├── requirements.txt     # alembic, psycopg
└── Dockerfile           # imagen python:3.13-slim que ejecuta `alembic upgrade head` y termina
```

- **Comandos** (desde la raíz, con [`uv`](https://docs.astral.sh/uv/), que crea el entorno de Python al vuelo):
  - `npm run db:migrate`: aplica las migraciones pendientes.
  - `npm run test:db`: tests de las migraciones (pytest).
- **Nueva migración:** `uv run --with-requirements db/requirements.txt alembic -c db/alembic.ini revision -m "descripción"` y escribir el SQL de `upgrade()` y `downgrade()`.
- **Despliegue:** el servicio `migrate` de `compose.yaml` usa `db/Dockerfile`; la app arranca solo cuando termina bien.
- **Versión aplicada:** Alembic la guarda en la tabla `alembic_version`.

## Consecuencias

- **Dos lenguajes en el repositorio:** TypeScript para la aplicación y Python para las migraciones. Es un coste real (otra imagen de Docker, `uv` en la CI), aceptado a cambio de una herramienta estándar.
- La imagen de la app se simplifica: ya no lleva scripts ni el paquete `postgres` suelto.
- Los tests de migraciones comprueban `upgrade`, que repetirlo no cambia nada y el ciclo `downgrade` → `upgrade`.
- La base de datos de la VPS, vacía, se reinició para que Alembic partiera de cero.

## Decisión

Usar Alembic como gestor de migraciones, con SQL escrito a mano en cada migración y su propia imagen de Docker.
