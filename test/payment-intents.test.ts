// API de pagos /v1/payment_intents (ADR-005, 006, 007), llamada como lo haría el servidor de un comercio.
// Necesita la BD migrada.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { sql } from "../lib/db.ts";
import { newId } from "../lib/ids.ts";
import { createApiKey } from "../lib/api-keys.ts";
import * as collection from "../src/app/v1/payment_intents/route.ts";
import * as single from "../src/app/v1/payment_intents/[id]/route.ts";
import * as cancel from "../src/app/v1/payment_intents/[id]/cancel/route.ts";

after(() => sql.end());

const PAYOUT = "0x2222222222222222222222222222222222222222";
const USDC_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

async function merchantWithKey({ payout = PAYOUT as string | null, livemode = false } = {}) {
  const id = newId("mer");
  await sql`INSERT INTO merchants (id, clerk_user_id, email, payout_address) VALUES (${id}, ${id}, 'pi@example.com', ${payout})`;
  return { merchantId: id, key: await createApiKey(id, livemode) };
}

function req(method: string, path: string, key?: string, body?: unknown) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key) headers.authorization = `Bearer ${key}`;
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });

const create = (key: string | undefined, body: unknown) => collection.POST(req("POST", "/v1/payment_intents", key, body));
const retrieve = (key: string, id: string) => single.GET(req("GET", `/v1/payment_intents/${id}`, key), params(id));
const list = (key: string, query = "") => collection.GET(req("GET", `/v1/payment_intents${query}`, key));
const cancelIntent = (key: string, id: string) => cancel.POST(req("POST", `/v1/payment_intents/${id}/cancel`, key), params(id));

const usdcBody = { amount: "10000000", currency: "usdc", description: "Camiseta", metadata: { order_id: "1234" } };

// ── Autenticación ───────────────────────────────────────────────────────────

test("sin API key → 401 authentication_error / api_key_invalid", async () => {
  const res = await create(undefined, usdcBody);
  assert.equal(res.status, 401);
  const { error } = await res.json();
  assert.equal(error.type, "authentication_error");
  assert.equal(error.code, "api_key_invalid");
  assert.match(res.headers.get("Request-Id") ?? "", /^req_[0-9a-f]{32}$/);
});

// ── Crear ───────────────────────────────────────────────────────────────────

test("crear un pago en USDC → 201 con los datos que fija el servidor", async () => {
  const { key } = await merchantWithKey();
  const res = await create(key, usdcBody);
  assert.equal(res.status, 201);
  const pi = await res.json();
  assert.match(pi.id, /^pi_[0-9a-f]{32}$/);
  assert.equal(pi.object, "payment_intent");
  assert.equal(pi.livemode, false);
  assert.equal(pi.amount, "10000000");
  assert.equal(pi.amount_received, "0");
  assert.equal(pi.currency, "usdc");
  assert.equal(pi.status, "requires_payment");
  assert.equal(pi.failure_code, null);
  assert.equal(pi.pay_to, PAYOUT);
  assert.equal(pi.chain_id, 84532);
  assert.equal(pi.token_address, USDC_SEPOLIA);
  assert.equal(pi.tx_hash, null);
  assert.equal(pi.description, "Camiseta");
  assert.deepEqual(pi.metadata, { order_id: "1234" });
  assert.match(pi.client_secret, new RegExp(`^${pi.id}_secret_[0-9a-f]{32}$`));
  assert.ok(pi.checkout_url.endsWith(`/pay/${pi.client_secret}`));
  assert.equal(pi.expires_at - pi.created, 3600);
});

test("crear un pago en ETH → sin token_address", async () => {
  const { key } = await merchantWithKey();
  const pi = await (await create(key, { amount: "1000000000000000", currency: "eth" })).json();
  assert.equal(pi.currency, "eth");
  assert.equal(pi.token_address, null);
});

test("con una clave live → red Base (8453) y USDC de mainnet", async () => {
  const { key } = await merchantWithKey({ livemode: true });
  const pi = await (await create(key, usdcBody)).json();
  assert.equal(pi.livemode, true);
  assert.equal(pi.chain_id, 8453);
  assert.equal(pi.token_address, USDC_BASE);
});

test("importes de ETH de más de 2^63 wei se aceptan sin perder precisión", async () => {
  const { key } = await merchantWithKey();
  const pi = await (await create(key, { amount: "1000000000000000000000000", currency: "eth" })).json();
  assert.equal(pi.amount, "1000000000000000000000000");
});

test("el client_secret solo se guarda como hash (ADR-010)", async () => {
  const { key } = await merchantWithKey();
  const pi = await (await create(key, usdcBody)).json();
  const [row] = await sql`SELECT client_secret_hash FROM payment_intents WHERE id = ${pi.id}`;
  assert.equal(row.client_secret_hash, createHash("sha256").update(pi.client_secret).digest("hex"));
});

test("expires_in cambia la caducidad", async () => {
  const { key } = await merchantWithKey();
  const pi = await (await create(key, { ...usdcBody, expires_in: 600 })).json();
  assert.equal(pi.expires_at - pi.created, 600);
});

const invalidBodies: [string, unknown, string | undefined][] = [
  ["importe cero", { ...usdcBody, amount: "0" }, "amount"],
  ["importe como número", { ...usdcBody, amount: 10 }, "amount"],
  ["importe con decimales", { ...usdcBody, amount: "10.5" }, "amount"],
  ["moneda desconocida", { ...usdcBody, currency: "btc" }, "currency"],
  ["el cliente intenta fijar pay_to (ADR-004, T5)", { ...usdcBody, pay_to: PAYOUT }, "pay_to"],
  ["metadata con valores que no son texto", { ...usdcBody, metadata: { n: 1 } }, "metadata"],
  ["expires_in demasiado corto", { ...usdcBody, expires_in: 10 }, "expires_in"],
  ["return_url que no es una URL http(s)", { ...usdcBody, return_url: "javascript:alert(1)" }, "return_url"],
  ["cuerpo que no es JSON", "esto no es json", undefined],
];
for (const [name, body, param] of invalidBodies) {
  test(`crear rechaza ${name} → 400 parameter_invalid`, async () => {
    const { key } = await merchantWithKey();
    const res = await create(key, body);
    assert.equal(res.status, 400);
    const { error } = await res.json();
    assert.equal(error.type, "invalid_request_error");
    assert.equal(error.code, "parameter_invalid");
    assert.equal(error.param, param);
  });
}

test("comercio sin cartera de cobro → 422 payout_address_missing", async () => {
  const { key } = await merchantWithKey({ payout: null });
  const res = await create(key, usdcBody);
  assert.equal(res.status, 422);
  assert.equal((await res.json()).error.code, "payout_address_missing");
});

// ── Consultar ───────────────────────────────────────────────────────────────

test("consultar un pago propio → 200, sin client_secret (solo se devuelve al crearlo)", async () => {
  const { key } = await merchantWithKey();
  const created = await (await create(key, usdcBody)).json();
  const res = await retrieve(key, created.id);
  assert.equal(res.status, 200);
  const pi = await res.json();
  assert.equal(pi.id, created.id);
  assert.equal(pi.amount, "10000000");
  assert.equal(pi.client_secret, null);
  assert.equal(pi.checkout_url, null);
});

test("consultar el pago de otro comercio → 404, como si no existiera (ADR-004, T6)", async () => {
  const a = await merchantWithKey();
  const b = await merchantWithKey();
  const pi = await (await create(a.key, usdcBody)).json();
  const res = await retrieve(b.key, pi.id);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, "resource_missing");
});

test("una clave de test no ve los pagos de live del mismo comercio", async () => {
  const live = await merchantWithKey({ livemode: true });
  const testKey = await createApiKey(live.merchantId, false);
  const pi = await (await create(live.key, usdcBody)).json();
  assert.equal((await retrieve(testKey, pi.id)).status, 404);
});

test("un pago sin pagar que pasa de expires_at se ve como expired (caducidad perezosa, ADR-007)", async () => {
  const { key } = await merchantWithKey();
  const pi = await (await create(key, usdcBody)).json();
  await sql`UPDATE payment_intents SET expires_at = now() - interval '1 second' WHERE id = ${pi.id}`;
  assert.equal((await (await retrieve(key, pi.id)).json()).status, "expired");
});

// ── Listar ──────────────────────────────────────────────────────────────────

test("listar: solo los pagos propios, del más reciente al más antiguo", async () => {
  const mine = await merchantWithKey();
  const other = await merchantWithKey();
  const first = await (await create(mine.key, usdcBody)).json();
  const second = await (await create(mine.key, usdcBody)).json();
  await create(other.key, usdcBody);
  const page = await (await list(mine.key)).json();
  assert.equal(page.object, "list");
  assert.deepEqual(page.data.map((pi: { id: string }) => pi.id), [second.id, first.id]);
  assert.equal(page.has_more, false);
});

test("listar con limit y starting_after recorre todas las páginas sin repetir", async () => {
  const { key } = await merchantWithKey();
  const ids = [];
  for (let i = 0; i < 5; i++) ids.unshift((await (await create(key, usdcBody)).json()).id);
  const page1 = await (await list(key, "?limit=2")).json();
  const page2 = await (await list(key, `?limit=2&starting_after=${page1.data[1].id}`)).json();
  const page3 = await (await list(key, `?limit=2&starting_after=${page2.data[1].id}`)).json();
  assert.deepEqual([...page1.data, ...page2.data, ...page3.data].map((pi: { id: string }) => pi.id), ids);
  assert.deepEqual([page1.has_more, page2.has_more, page3.has_more], [true, true, false]);
});

test("listar filtrando por estado", async () => {
  const { key } = await merchantWithKey();
  const kept = await (await create(key, usdcBody)).json();
  const canceled = await (await create(key, usdcBody)).json();
  await cancelIntent(key, canceled.id);
  const page = await (await list(key, "?status=canceled")).json();
  assert.deepEqual(page.data.map((pi: { id: string }) => pi.id), [canceled.id]);
  assert.notEqual(kept.id, canceled.id);
});

test("listar con un limit fuera de rango → 400", async () => {
  const { key } = await merchantWithKey();
  const res = await list(key, "?limit=500");
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.param, "limit");
});

// ── Cancelar ────────────────────────────────────────────────────────────────

test("cancelar un pago sin pagar → 200 canceled", async () => {
  const { key } = await merchantWithKey();
  const pi = await (await create(key, usdcBody)).json();
  const res = await cancelIntent(key, pi.id);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, "canceled");
});

test("cancelar un pago que ya no está en requires_payment → 409 payment_intent_unexpected_state", async () => {
  const { key } = await merchantWithKey();
  const pi = await (await create(key, usdcBody)).json();
  await cancelIntent(key, pi.id);
  const res = await cancelIntent(key, pi.id);
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, "payment_intent_unexpected_state");
});

test("cancelar el pago de otro comercio → 404 (ADR-004, T6)", async () => {
  const a = await merchantWithKey();
  const b = await merchantWithKey();
  const pi = await (await create(a.key, usdcBody)).json();
  assert.equal((await cancelIntent(b.key, pi.id)).status, 404);
  assert.equal((await (await retrieve(a.key, pi.id)).json()).status, "requires_payment");
});
