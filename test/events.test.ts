// Patrón outbox (ADR-009): cada vez que un pago llega a un estado final se guarda UN evento,
// en la misma transacción de la base de datos que el cambio de estado. Necesita la BD migrada.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { numeric, sql } from "../lib/db.ts";
import { newId } from "../lib/ids.ts";
import { createApiKey } from "../lib/api-keys.ts";
import { createPaymentIntent, type Row } from "../lib/payment-intents.ts";
import { checkPayment } from "../lib/settle.ts";
import { getCheckout } from "../lib/checkout.ts";
import { EVENT_TYPES } from "../lib/events.ts";
import * as single from "../src/app/v1/payment_intents/[id]/route.ts";
import * as cancel from "../src/app/v1/payment_intents/[id]/cancel/route.ts";
import { loadFixture, randomTxHash, startFakeNode } from "./helpers/fake-node.ts";

const usdc = loadFixture("usdc-transfer"); // 1000 unidades de USDC a 0xb733…2810
const RECIPIENT = "0xb733d15fc0e90f0642fd369796c8025f18742810";
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

let node: Awaited<ReturnType<typeof startFakeNode>>;
before(async () => {
  node = await startFakeNode();
  process.env.BASE_SEPOLIA_RPC_URL = node.url;
});
after(async () => {
  node.close();
  await sql.end();
});

async function newMerchant() {
  const merchantId = newId("mer");
  await sql`INSERT INTO merchants (id, clerk_user_id, email, payout_address) VALUES (${merchantId}, ${merchantId}, 'ev@example.com', ${RECIPIENT})`;
  return { merchantId, key: await createApiKey(merchantId, false) };
}

const eventsOf = (paymentId: string) =>
  sql`SELECT * FROM events WHERE data->'object'->>'id' = ${paymentId} ORDER BY created_at`;

// Pago en processing que corresponde a la transacción real de USDC del fixture.
async function processingIntent(amount = 1000n) {
  const { merchantId } = await newMerchant();
  const txHash = randomTxHash();
  node.serve(txHash, usdc);
  const createdAt = new Date((Number(BigInt(usdc.block.timestamp)) - 60) * 1000);
  const [row] = await sql<Row[]>`
    INSERT INTO payment_intents (id, merchant_id, livemode, amount, currency, chain_id, token_address, pay_to,
                                 status, tx_hash, client_secret_hash, created_at, expires_at)
    VALUES (${newId("pi")}, ${merchantId}, false, ${numeric(amount)}, 'usdc', 84532, ${USDC}, ${RECIPIENT},
            'processing', ${txHash}, ${newId("h")}, ${createdAt}, ${createdAt})
    RETURNING *`;
  return row;
}

test("los tipos de evento son los de la spec", () => {
  assert.deepEqual(EVENT_TYPES, [
    "payment_intent.succeeded",
    "payment_intent.failed",
    "payment_intent.canceled",
    "payment_intent.expired",
  ]);
});

test("pago verificado → un evento payment_intent.succeeded con el pago completo, pendiente de enviar", async () => {
  node.setConfirmations(usdc, 5);
  const intent = await processingIntent();
  await checkPayment(intent);
  const events = await eventsOf(intent.id);
  assert.equal(events.length, 1);
  const [event] = events;
  assert.match(event.id, /^evt_[0-9a-f]{32}$/);
  assert.equal(event.type, "payment_intent.succeeded");
  assert.equal(event.merchant_id, intent.merchant_id);
  assert.equal(event.livemode, false);
  assert.equal(event.delivery_status, "pending");
  assert.equal(event.data.object.status, "succeeded");
  assert.equal(event.data.object.amount_received, "1000");
  assert.equal(event.data.object.object, "payment_intent");
});

test("pago que no cumple → un evento payment_intent.failed", async () => {
  node.setConfirmations(usdc, 5);
  const intent = await processingIntent(5000n); // paga de menos
  await checkPayment(intent);
  const events = await eventsOf(intent.id);
  assert.deepEqual(events.map((e) => e.type), ["payment_intent.failed"]);
  assert.equal(events[0].data.object.failure_code, "amount_mismatch");
});

test("mientras sigue en processing no se genera ningún evento", async () => {
  node.setConfirmations(usdc, 1);
  const intent = await processingIntent();
  await checkPayment(intent);
  assert.equal((await eventsOf(intent.id)).length, 0);
});

test("dos procesos verificando el mismo pago a la vez → un solo evento", async () => {
  node.setConfirmations(usdc, 5);
  const intent = await processingIntent();
  await Promise.all([checkPayment(intent), checkPayment(intent)]);
  assert.equal((await eventsOf(intent.id)).length, 1);
});

test("cancelar → un evento payment_intent.canceled", async () => {
  const { merchantId, key } = await newMerchant();
  const { row } = (await createPaymentIntent({ merchantId, livemode: false }, { amount: "1000", currency: "usdc" }))!;
  await cancel.POST(
    new Request(`http://localhost/v1/payment_intents/${row.id}/cancel`, { method: "POST", headers: { authorization: `Bearer ${key}` } }),
    { params: Promise.resolve({ id: row.id }) },
  );
  assert.deepEqual((await eventsOf(row.id)).map((e) => e.type), ["payment_intent.canceled"]);
});

test("caducar al consultarlo el comercio → un evento payment_intent.expired, sin repetirlo", async () => {
  const { merchantId, key } = await newMerchant();
  const { row } = (await createPaymentIntent({ merchantId, livemode: false }, { amount: "1000", currency: "usdc" }))!;
  await sql`UPDATE payment_intents SET expires_at = now() - interval '1 second' WHERE id = ${row.id}`;
  const get = () =>
    single.GET(new Request(`http://localhost/v1/payment_intents/${row.id}`, { headers: { authorization: `Bearer ${key}` } }), {
      params: Promise.resolve({ id: row.id }),
    });
  await get();
  await get();
  assert.deepEqual((await eventsOf(row.id)).map((e) => e.type), ["payment_intent.expired"]);
});

test("caducar al abrir el checkout → un evento payment_intent.expired", async () => {
  const { merchantId } = await newMerchant();
  const created = (await createPaymentIntent({ merchantId, livemode: false }, { amount: "1000", currency: "usdc" }))!;
  await sql`UPDATE payment_intents SET expires_at = now() - interval '1 second' WHERE id = ${created.row.id}`;
  await getCheckout(created.clientSecret);
  assert.deepEqual((await eventsOf(created.row.id)).map((e) => e.type), ["payment_intent.expired"]);
});
