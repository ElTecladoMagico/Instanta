"""Cartera que firmó el pago en el checkout (ADR-004, T13).

verify() solo cuenta los fondos que salen de ella. NULL en pagos enviados antes de esta columna.
"""

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE payment_intents ADD COLUMN payer_address text")


def downgrade() -> None:
    op.execute("ALTER TABLE payment_intents DROP COLUMN payer_address")
