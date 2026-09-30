// Necesita la base de datos migrada:  npm run db:migrate
import { test } from "node:test";
import assert from "node:assert/strict";
import { sql } from "../lib/db.ts";

test("un tx_hash en mayúsculas no puede esquivar el UNIQUE (ADR-004, T2)", async () => {
  await sql`INSERT INTO merchants (id, clerk_user_id, email) VALUES ('mer_t2', 'user_t2', 't2@example.com') ON CONFLICT DO NOTHING`;
  await assert.rejects(
    sql`INSERT INTO payment_intents (id, merchant_id, livemode, amount, currency, chain_id, token_address, pay_to, status, tx_hash, client_secret_hash, expires_at)
        VALUES ('pi_t2', 'mer_t2', false, 1, 'usdc', 84532, ${"0x" + "a".repeat(40)}, ${"0x" + "b".repeat(40)}, 'processing', ${"0x" + "C".repeat(64)}, 'h_t2', now())`,
    /payment_intents_tx_hash_check/,
  );
  await sql.end();
});
