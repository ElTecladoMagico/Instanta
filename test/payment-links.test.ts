// Payment links (ADR-010): el botón embebible crea un pago en el servidor a partir del enlace guardado.
// Necesita la BD migrada.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { sql } from "../lib/db.ts";
import { newId } from "../lib/ids.ts";
import { createPaymentLink } from "../lib/payment-links.ts";
import * as linkCheckout from "../src/app/v1/payment_links/[id]/checkout/route.ts";

after(() => sql.end());

const PAYOUT = "0x3333333333333333333333333333333333333333";

async function newLink({ payout = PAYOUT as string | null, active = true } = {}) {
  const merchantId = newId("mer");
  await sql`INSERT INTO merchants (id, clerk_user_id, email, payout_address) VALUES (${merchantId}, ${merchantId}, 'links@example.com', ${payout})`;
  const id = await createPaymentLink({ merchantId, livemode: false }, { title: "Ebook", amount: 5_000_000n, currency: "usdc" });
  if (!active) await sql`UPDATE payment_links SET active = false WHERE id = ${id}`;
  return id;
}

const click = (id: string) =>
  linkCheckout.POST(new Request(`http://localhost/v1/payment_links/${id}/checkout`, { method: "POST" }), {
    params: Promise.resolve({ id }),
  });

test("createPaymentLink guarda el enlace y devuelve un id pl_…", async () => {
  const id = await newLink();
  assert.match(id, /^pl_[0-9a-f]{32}$/);
  const [row] = await sql`SELECT title, amount, currency, active FROM payment_links WHERE id = ${id}`;
  assert.deepEqual({ ...row }, { title: "Ebook", amount: 5_000_000n, currency: "usdc", active: true });
});

test("clic en el botón → 201 con la URL del checkout y CORS abierto (lo llama la web del comercio)", async () => {
  const res = await click(await newLink());
  assert.equal(res.status, 201);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "*");
  const { checkout_url } = await res.json();
  assert.match(checkout_url, /\/pay\/pi_[0-9a-f]{32}_secret_[0-9a-f]{32}$/);
});

test("el pago creado copia importe, moneda y título del enlace, y el destino del comercio", async () => {
  const id = await newLink();
  await click(id);
  const [pi] = await sql`
    SELECT amount, currency, description, pay_to, status, payment_link_id,
           extract(epoch FROM expires_at - created_at)::int AS lifetime
    FROM payment_intents WHERE payment_link_id = ${id}`;
  assert.deepEqual({ ...pi }, {
    amount: 5_000_000n,
    currency: "usdc",
    description: "Ebook",
    pay_to: PAYOUT,
    status: "requires_payment",
    payment_link_id: id,
    lifetime: 3600,
  });
});

test("cada clic crea un pago distinto", async () => {
  const id = await newLink();
  await click(id);
  await click(id);
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM payment_intents WHERE payment_link_id = ${id}`;
  assert.equal(count, 2);
});

test("enlace desactivado o inexistente → 404", async () => {
  assert.equal((await click(await newLink({ active: false }))).status, 404);
  assert.equal((await click("pl_" + "0".repeat(32))).status, 404);
});

test("comercio sin cartera de cobro → 422 payout_address_missing", async () => {
  const res = await click(await newLink({ payout: null }));
  assert.equal(res.status, 422);
  assert.equal((await res.json()).error.code, "payout_address_missing");
});
