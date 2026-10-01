"""Cuándo envió el comprador su transacción (submit).

El worker lo necesita para dar por fallido (tx_not_found) un pago cuya transacción no llega a minarse.
"""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE payment_intents ADD COLUMN submitted_at timestamptz")


def downgrade() -> None:
    op.execute("ALTER TABLE payment_intents DROP COLUMN submitted_at")
