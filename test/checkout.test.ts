// Rutas públicas del checkout (ADR-010): las usa la página de pago con el client_secret, sin API key.
// Nodo falso con transacciones reales + BD real. Necesita la BD migrada.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { sql } from "../lib/db.ts";
import { newId } from "../lib/ids.ts";
import { createApiKey } from "../lib/api-keys.ts";
import { createPaymentIntent } from "../lib/payment-intents.ts";
import * as session from "../src/app/v1/checkout/[client_secret]/route.ts";
import * as submit from "../src/app/v1/checkout/[client_secret]/submit/route.ts";
import * as merchantGet from "../src/app/v1/payment_intents/[id]/route.ts";
import { loadFixture, randomTxHash, startFakeNode } from "./helpers/fake-node.ts";

const usdc = loadFixture("usdc-transfer"); // 1000 unidades de USDC a 0xb733…2810
const RECIPIENT = "0xb733d15fc0e90f0642fd369796c8025f18742810";

let node: Awaited<ReturnType<typeof startFakeNode>>;
before(async () => {
  node = await startFakeNode();
  process.env.BASE_SEPOLIA_RPC_URL = node.url;
});
after(async () => {
  node.close();
  await sql.end();
});

// Un pago de 1000 unidades de USDC a la cartera del fixture, creado justo antes de su transacción real.
async function newIntent({ expired = false, name = "Tienda de pruebas" as string | null } = {}) {
  const merchantId = newId("mer");
  await sql`INSERT INTO merchants (id, clerk_user_id, email, name, payout_address)
            VALUES (${merchantId}, ${merchantId}, 'shop@example.com', ${name}, ${RECIPIENT})`;
  const auth = { merchantId, livemode: false };
  const created = await createPaymentIntent(auth, { amount: "1000", currency: "usdc", description: "Taza", metadata: { secret_note: "x" } });
  const createdAt = new Date((Number(BigInt(usdc.block.timestamp)) - 60) * 1000);
  const expiresAt = expired ? new Date(Date.now() - 1000) : new Date(Date.now() + 3_600_000);
  await sql`UPDATE payment_intents SET created_at = ${createdAt}, expires_at = ${expiresAt} WHERE id = ${created!.row.id}`;
  return { id: created!.row.id, secret: created!.clientSecret, key: await createApiKey(merchantId, false) };
}

const params = (client_secret: string) => ({ params: Promise.resolve({ client_secret }) });
const getSession = (secret: string) => session.GET(new Request(`http://localhost/v1/checkout/${secret}`), params(secret));
const postSubmit = (secret: string, body: unknown) =>
  submit.POST(
    new Request(`http://localhost/v1/checkout/${secret}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    params(secret),
  );
// Hash nuevo que el nodo falso responde con la transacción real de USDC.
const servedHash = () => {
  const hash = randomTxHash();
  node.serve(hash, usdc);
  return hash;
};

// ── Consultar ───────────────────────────────────────────────────────────────

test("client_secret desconocido → 404 resource_missing", async () => {
  const res = await getSession("pi_x_secret_y");
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, "resource_missing");
});

test("consultar → datos para pagar, sin metadata ni datos privados del comercio", async () => {
  const { id, secret } = await newIntent();
  const res = await getSession(secret);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("Request-Id") ?? "", /^req_/);
  assert.deepEqual(await res.json(), {
    id,
    amount: "1000",
    currency: "usdc",
    status: "requires_payment",
    failure_code: null,
    pay_to: RECIPIENT,
    chain_id: 84532,
    token_address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    merchant_name: "Tienda de pruebas",
    description: "Taza",
    tx_hash: null,
    return_url: null,
    expires_at: (await sql`SELECT expires_at FROM payment_intents WHERE id = ${id}`)[0].expires_at.getTime() / 1000 | 0,
  });
});

test("un pago vencido se ve como expired", async () => {
  const { secret } = await newIntent({ expired: true });
  assert.equal((await (await getSession(secret)).json()).status, "expired");
});

// ── Enviar la transacción ───────────────────────────────────────────────────

test("tx_hash mal formado → 400 parameter_invalid / tx_hash", async () => {
  const { secret } = await newIntent();
  const res = await postSubmit(secret, { tx_hash: "0x1234" });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.param, "tx_hash");
});

test("cuerpo que no es JSON → 400", async () => {
  const { secret } = await newIntent();
  assert.equal((await postSubmit(secret, "no json")).status, 400);
});

test("client_secret desconocido → 404", async () => {
  assert.equal((await postSubmit("pi_x_secret_y", { tx_hash: randomTxHash() })).status, 404);
});

test("transacción correcta y confirmada → succeeded en la misma respuesta", async () => {
  node.setConfirmations(usdc, 5);
  const { secret } = await newIntent();
  const res = await postSubmit(secret, { tx_hash: servedHash() });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "succeeded");
});

test("el tx_hash se guarda en minúsculas aunque llegue en mayúsculas (ADR-004, T2)", async () => {
  node.setConfirmations(usdc, 5);
  const { id, secret } = await newIntent();
  const hash = servedHash();
  await postSubmit(secret, { tx_hash: "0x" + hash.slice(2).toUpperCase() });
  const [row] = await sql`SELECT tx_hash FROM payment_intents WHERE id = ${id}`;
  assert.equal(row.tx_hash, hash);
});

test("con pocas confirmaciones queda en processing; al consultar después se completa", async () => {
  node.setConfirmations(usdc, 1);
  const { secret } = await newIntent();
  assert.equal((await (await postSubmit(secret, { tx_hash: servedHash() })).json()).status, "processing");
  node.setConfirmations(usdc, 5);
  assert.equal((await (await getSession(secret)).json()).status, "succeeded");
});

test("el comercio, al consultar su pago en processing, también provoca la comprobación", async () => {
  node.setConfirmations(usdc, 1);
  const { id, secret, key } = await newIntent();
  await postSubmit(secret, { tx_hash: servedHash() });
  node.setConfirmations(usdc, 5);
  const res = await merchantGet.GET(
    new Request(`http://localhost/v1/payment_intents/${id}`, { headers: { authorization: `Bearer ${key}` } }),
    { params: Promise.resolve({ id }) },
  );
  assert.equal((await res.json()).status, "succeeded");
});

test("no se puede enviar una segunda transacción → 409 payment_intent_unexpected_state", async () => {
  node.setConfirmations(usdc, 1);
  const { secret } = await newIntent();
  await postSubmit(secret, { tx_hash: servedHash() });
  const res = await postSubmit(secret, { tx_hash: servedHash() });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, "payment_intent_unexpected_state");
});

test("la misma transacción no puede pagar dos pagos → 409 tx_already_used (ADR-004, T2)", async () => {
  node.setConfirmations(usdc, 1);
  const first = await newIntent();
  const second = await newIntent();
  const hash = servedHash();
  await postSubmit(first.secret, { tx_hash: hash });
  const res = await postSubmit(second.secret, { tx_hash: hash });
  assert.equal(res.status, 409);
  const { error } = await res.json();
  assert.equal(error.code, "tx_already_used");
  assert.equal(error.param, "tx_hash");
});

test("un pago vencido no admite transacciones → 409", async () => {
  const { secret } = await newIntent({ expired: true });
  assert.equal((await postSubmit(secret, { tx_hash: servedHash() })).status, 409);
});

test("el cuerpo no puede cambiar el importe ni el destino: se ignoran (ADR-004, T5)", async () => {
  node.setConfirmations(usdc, 1);
  const { id, secret } = await newIntent();
  await postSubmit(secret, { tx_hash: servedHash(), amount: "1", pay_to: "0x1111111111111111111111111111111111111111" });
  const [row] = await sql`SELECT amount, pay_to FROM payment_intents WHERE id = ${id}`;
  assert.deepEqual({ ...row }, { amount: 1000n, pay_to: RECIPIENT });
});

test("un comercio sin nombre aparece como Instanta en el checkout", async () => {
  const { secret } = await newIntent({ name: null });
  assert.equal((await (await getSession(secret)).json()).merchant_name, "Instanta");
});

test("enviar la transacción guarda cuándo se envió (submitted_at)", async () => {
  node.setConfirmations(usdc, 1);
  const { id, secret } = await newIntent();
  await postSubmit(secret, { tx_hash: servedHash() });
  const [row] = await sql`SELECT submitted_at FROM payment_intents WHERE id = ${id}`;
  assert.ok(row.submitted_at instanceof Date);
  assert.ok(Date.now() - row.submitted_at.getTime() < 60_000);
});
