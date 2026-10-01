"""Las migraciones de Alembic crean el esquema, se pueden deshacer y repetir (ADR-014).

Se ejecuta contra la base de datos de DATABASE_URL:  npm run test:db
"""

import os
import subprocess

import psycopg

DATABASE_URL = os.environ["DATABASE_URL"]
TABLES = {"merchants", "api_keys", "payment_links", "payment_intents", "webhook_endpoints", "events"}


def alembic(*args: str) -> None:
    subprocess.run(["alembic", "-c", "db/alembic.ini", *args], check=True)


def tables() -> set[str]:
    with psycopg.connect(DATABASE_URL) as conn:
        rows = conn.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public'").fetchall()
    return {name for (name,) in rows}


def test_upgrade_creates_all_tables():
    alembic("upgrade", "head")
    assert TABLES <= tables()


def test_upgrade_twice_changes_nothing():
    alembic("upgrade", "head")
    alembic("upgrade", "head")
    assert TABLES <= tables()


def test_downgrade_removes_everything_and_upgrade_restores_it():
    alembic("upgrade", "head")
    alembic("downgrade", "base")
    assert not TABLES & tables()
    alembic("upgrade", "head")
    assert TABLES <= tables()


def columns(table: str) -> set[str]:
    with psycopg.connect(DATABASE_URL) as conn:
        rows = conn.execute("SELECT column_name FROM information_schema.columns WHERE table_name = %s", (table,)).fetchall()
    return {name for (name,) in rows}


def test_0002_adds_submitted_at_and_downgrade_removes_it():
    alembic("upgrade", "head")
    assert "submitted_at" in columns("payment_intents")
    alembic("downgrade", "0001")
    assert "submitted_at" not in columns("payment_intents")
    alembic("upgrade", "head")
