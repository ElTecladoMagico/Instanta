// Cada regla del esquema, probada en positivo y en negativo. Necesita la BD migrada: npm run db:migrate
// Códigos de error de Postgres: 23514 = viola un CHECK, 23505 = viola un UNIQUE.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { sql } from "../lib/db.ts";
import { newId } from "../lib/ids.ts";

after(() => sql.end());

const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const MERCHANT_WALLET = "0x" + "b".repeat(40);
const txHash = () => "0x" + randomBytes(32).toString("hex");

async function newMerchant(): Promise<string> {
  const id = newId("mer");
  await sql`INSERT INTO merchants (id, clerk_user_id, email) VALUES (${id}, ${id}, 'test@example.com')`;
  return id;
}

// Un pago válido en USDC, en processing. Cada caso cambia solo lo que quiere probar.
async function insertIntent(overrides: Record<string, unknown> = {}) {
  const row = {
    id: newId("pi"),
    merchant_id: await newMerchant(),
    livemode: false,
    amount: 10_000_000n,
    currency: "usdc",
    chain_id: 84532,
    token_address: USDC,
    pay_to: MERCHANT_WALLET,
    status: "processing",
    tx_hash: txHash(),
    client_secret_hash: newId("h"),
    expires_at: new Date(Date.now() + 3_600_000),
    ...overrides,
  };
  await sql`INSERT INTO payment_intents ${sql(row)}`;
  return row;
}

async function rejectsWith(code: string, promise: Promise<unknown>) {
  await assert.rejects(promise, (err: { code?: string }) => err.code === code);
}

test("un pago válido en USDC se guarda", async () => {
  await insertIntent();
});

test("un pago válido en ETH (sin token_address) se guarda", async () => {
  await insertIntent({ currency: "eth", token_address: null, status: "requires_payment", tx_hash: null });
});

test("importes de ETH mayores que un BIGINT (1 000 000 ETH en wei) se guardan y se leen sin perder precisión", async () => {
  const amount = 10n ** 24n; // > 2^63
  const row = await insertIntent({ currency: "eth", token_address: null, amount });
  const [{ amount: stored }] = await sql`SELECT amount FROM payment_intents WHERE id = ${row.id}`;
  assert.equal(stored, amount);
});

const invalid: [string, Record<string, unknown>][] = [
  ["importe cero", { amount: 0n }],
  ["moneda desconocida", { currency: "btc" }],
  ["ETH con token_address", { currency: "eth" }],
  ["USDC sin token_address", { token_address: null }],
  ["red desconocida", { chain_id: 1 }],
  ["dirección de cobro mal formada", { pay_to: "0x123" }],
  ["estado inventado", { status: "paid" }],
  ["processing sin tx_hash", { tx_hash: null }],
  ["requires_payment con tx_hash", { status: "requires_payment" }],
  ["succeeded sin succeeded_at", { status: "succeeded" }],
  ["failed sin failure_code", { status: "failed" }],
  ["código de fallo inventado", { status: "failed", failure_code: "because" }],
  ["tx_hash en mayúsculas (esquivaría el UNIQUE, ADR-004 T2)", { tx_hash: "0x" + "C".repeat(64) }],
];
for (const [name, overrides] of invalid) {
  test(`rechaza: ${name}`, async () => {
    await rejectsWith("23514", insertIntent(overrides));
  });
}

test("rechaza usar la misma transacción en dos pagos (ADR-004, T2)", async () => {
  const hash = txHash();
  await insertIntent({ tx_hash: hash });
  await rejectsWith("23505", insertIntent({ tx_hash: hash }));
});

test("rechaza un tipo de evento inventado", async () => {
  const merchant = await newMerchant();
  await rejectsWith(
    "23514",
    sql`INSERT INTO events (id, merchant_id, livemode, type, data) VALUES (${newId("evt")}, ${merchant}, false, 'payment_intent.paid', '{}')`,
  );
});

test("rechaza un segundo endpoint de webhooks para el mismo comercio y modo", async () => {
  const merchant = await newMerchant();
  const insert = () =>
    sql`INSERT INTO webhook_endpoints (id, merchant_id, livemode, url, secret) VALUES (${newId("we")}, ${merchant}, false, 'https://example.com/hook', 'whsec_x')`;
  await insert();
  await rejectsWith("23505", insert());
});
