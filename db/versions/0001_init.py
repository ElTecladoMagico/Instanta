"""Esquema inicial: comercios, claves, enlaces de pago, pagos, webhooks y eventos.

ADR-002, 006, 007, 009, 010 y 013. SQL escrito a mano; Alembic solo lleva el control de versiones.
"""

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
-- Esquema inicial (ADR-002, ADR-006, ADR-007, ADR-009, ADR-010, ADR-013).
-- Importes en unidades mínimas: NUMERIC(78,0) cabe cualquier uint256 (ETH tiene 18 decimales).
-- Ids públicos con prefijo, generados en la app.

CREATE TABLE merchants (
  id             text PRIMARY KEY,                 -- mer_…
  clerk_user_id  text NOT NULL UNIQUE,
  email          text NOT NULL,
  name           text,
  payout_address text CHECK (payout_address ~ '^0x[0-9a-fA-F]{40}$'),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE api_keys (
  id          text PRIMARY KEY,                    -- key_…
  merchant_id text NOT NULL REFERENCES merchants (id),
  livemode    boolean NOT NULL,
  prefix      text NOT NULL,                       -- parte visible, p. ej. sk_test_4f1c
  key_hash    text NOT NULL UNIQUE,                -- SHA-256 de la clave; la clave nunca se guarda
  created_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at  timestamptz
);
CREATE INDEX api_keys_merchant_idx ON api_keys (merchant_id);

CREATE TABLE payment_links (
  id          text PRIMARY KEY,                    -- pl_…
  merchant_id text NOT NULL REFERENCES merchants (id),
  livemode    boolean NOT NULL,
  title       text NOT NULL,
  amount      numeric(78,0) NOT NULL CHECK (amount > 0),
  currency    text NOT NULL CHECK (currency IN ('usdc', 'eth')),
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_links_merchant_idx ON payment_links (merchant_id);

CREATE TABLE payment_intents (
  id                 text PRIMARY KEY,             -- pi_…
  merchant_id        text NOT NULL REFERENCES merchants (id),
  payment_link_id    text REFERENCES payment_links (id),
  livemode           boolean NOT NULL,
  amount             numeric(78,0) NOT NULL CHECK (amount > 0),
  amount_received    numeric(78,0) NOT NULL DEFAULT 0 CHECK (amount_received >= 0),
  currency           text NOT NULL CHECK (currency IN ('usdc', 'eth')),
  chain_id           integer NOT NULL CHECK (chain_id IN (84532, 8453)),
  token_address      text CHECK (token_address ~ '^0x[0-9a-fA-F]{40}$'),  -- NULL si es ETH
  pay_to             text NOT NULL CHECK (pay_to ~ '^0x[0-9a-fA-F]{40}$'),
  status             text NOT NULL DEFAULT 'requires_payment'
                     CHECK (status IN ('requires_payment', 'processing', 'succeeded', 'failed', 'canceled', 'expired')),
  failure_code       text
                     CHECK (failure_code IN ('reverted', 'amount_mismatch', 'wrong_recipient', 'wrong_token', 'tx_too_old', 'tx_not_found')),
  -- En minúsculas: si no, el mismo hash en otra capitalización esquivaría el UNIQUE (ADR-004, T2).
  tx_hash            text UNIQUE CHECK (tx_hash ~ '^0x[0-9a-f]{64}$'),
  client_secret_hash text NOT NULL UNIQUE,
  description        text,
  metadata           jsonb NOT NULL DEFAULT '{}',
  return_url         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL,
  succeeded_at       timestamptz,
  CHECK ((currency = 'eth') = (token_address IS NULL)),
  -- Invariantes de la máquina de estados (ADR-007):
  CHECK ((tx_hash IS NOT NULL) = (status IN ('processing', 'succeeded', 'failed'))),
  CHECK ((succeeded_at IS NOT NULL) = (status = 'succeeded')),
  CHECK ((failure_code IS NOT NULL) = (status = 'failed'))
);
CREATE INDEX payment_intents_merchant_idx ON payment_intents (merchant_id, created_at DESC, id DESC);
CREATE INDEX payment_intents_processing_idx ON payment_intents (created_at) WHERE status = 'processing';

CREATE TABLE webhook_endpoints (
  id          text PRIMARY KEY,                    -- we_…
  merchant_id text NOT NULL REFERENCES merchants (id),
  livemode    boolean NOT NULL,
  url         text NOT NULL,
  secret      text NOT NULL,                       -- whsec_…; hace falta en claro para firmar
  enabled     boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, livemode)                   -- uno por comercio y modo en esta versión
);

-- Outbox de webhooks e historial de eventos (ADR-009).
CREATE TABLE events (
  id              text PRIMARY KEY,                -- evt_…
  merchant_id     text NOT NULL REFERENCES merchants (id),
  livemode        boolean NOT NULL,
  type            text NOT NULL
                  CHECK (type IN ('payment_intent.succeeded', 'payment_intent.failed', 'payment_intent.canceled', 'payment_intent.expired')),
  data            jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'failed')),
  attempts        integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error      text
);
CREATE INDEX events_merchant_idx ON events (merchant_id, created_at DESC, id DESC);
CREATE INDEX events_pending_idx ON events (next_attempt_at) WHERE delivery_status = 'pending';
""")


def downgrade() -> None:
    # En orden inverso a las claves foráneas.
    op.execute("""
DROP TABLE events;
DROP TABLE webhook_endpoints;
DROP TABLE payment_intents;
DROP TABLE payment_links;
DROP TABLE api_keys;
DROP TABLE merchants;
""")
