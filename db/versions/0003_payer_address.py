"""Cartera que firmó el pago en el checkout (ADR-004, T13).

verify() solo cuenta los fondos que salen de ella. NULL en pagos enviados antes de esta columna.
Si los fondos salen de otra cartera, el pago falla con wrong_payer.
"""

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

OLD = "('reverted', 'amount_mismatch', 'wrong_recipient', 'wrong_token', 'tx_too_old', 'tx_not_found')"
NEW = "('reverted', 'amount_mismatch', 'wrong_recipient', 'wrong_token', 'wrong_payer', 'tx_too_old', 'tx_not_found')"


def _failure_codes(codes: str) -> None:
    op.execute("ALTER TABLE payment_intents DROP CONSTRAINT payment_intents_failure_code_check")
    op.execute(f"ALTER TABLE payment_intents ADD CONSTRAINT payment_intents_failure_code_check CHECK (failure_code IN {codes})")


def upgrade() -> None:
    op.execute("ALTER TABLE payment_intents ADD COLUMN payer_address text")
    _failure_codes(NEW)


def downgrade() -> None:
    op.execute("UPDATE payment_intents SET failure_code = 'wrong_recipient' WHERE failure_code = 'wrong_payer'")
    _failure_codes(OLD)
    op.execute("ALTER TABLE payment_intents DROP COLUMN payer_address")
