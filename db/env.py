"""Alembic ejecuta este archivo en cada comando: conecta a DATABASE_URL y aplica las migraciones.

Las migraciones son SQL escrito a mano (op.execute); no hay modelos de SQLAlchemy (ADR-002, ADR-014).
"""

import os

from alembic import context
from sqlalchemy import create_engine

# La app usa "postgres://…"; SQLAlchemy necesita que se le diga el driver: "postgresql+psycopg://…".
url = os.environ["DATABASE_URL"].replace("postgres://", "postgresql+psycopg://", 1)

with create_engine(url).connect() as connection:
    context.configure(connection=connection)
    with context.begin_transaction():  # en Postgres, todas las migraciones pendientes van en una transacción
        context.run_migrations()
