// Lógica del dashboard (ADR-006, ADR-012): la cuenta del comercio y lo que gestiona desde el panel.
// Necesita la BD migrada.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { sql } from "../lib/db.ts";
import { newId } from "../lib/ids.ts";
import { authenticate, createApiKey } from "../lib/api-keys.ts";
import { createPaymentLink } from "../lib/payment-links.ts";
import {
  ensureMerchant,
  listApiKeys,
  listPaymentLinks,
  resendEvent,
  revokeApiKey,
  setPaymentLinkActive,
  updateProfile,
} from "../lib/merchants.ts";

after(() => sql.end());

const clerkId = () => newId("user");
const bearer = (key: string) => new Request("http://localhost", { headers: { authorization: `Bearer ${key}` } });

// ── Cuenta ──────────────────────────────────────────────────────────────────

test("ensureMerchant crea el comercio la primera vez y devuelve el mismo después", async () => {
  const user = clerkId();
  const first = await ensureMerchant(user, "shop@example.com");
  assert.match(first.id, /^mer_[0-9a-f]{32}$/);
  assert.equal(first.email, "shop@example.com");
  assert.equal(first.payout_address, null);
  const again = await ensureMerchant(user, "shop@example.com");
  assert.equal(again.id, first.id);
});

test("updateProfile guarda nombre y cartera de cobro válidos", async () => {
  const merchant = await ensureMerchant(clerkId(), "p@example.com");
  const result = await updateProfile(merchant.id, { name: "Mi tienda", payoutAddress: "0xAE76BEEdd8DD39878D22E1b7a8Ff96e5c5e8B17b" });
  assert.equal(result, "ok");
  const [row] = await sql`SELECT name, payout_address FROM merchants WHERE id = ${merchant.id}`;
  assert.deepEqual({ ...row }, { name: "Mi tienda", payout_address: "0xAE76BEEdd8DD39878D22E1b7a8Ff96e5c5e8B17b" });
});

test("updateProfile rechaza una cartera mal escrita (checksum EIP-55 incorrecto o formato inválido)", async () => {
  const merchant = await ensureMerchant(clerkId(), "p@example.com");
  // Misma dirección con una letra cambiada de mayúscula: el checksum ya no cuadra (posible error al copiarla).
  assert.equal(await updateProfile(merchant.id, { name: "x", payoutAddress: "0xae76BEEdd8DD39878D22E1b7a8Ff96e5c5e8B17b" }), "invalid_address");
  assert.equal(await updateProfile(merchant.id, { name: "x", payoutAddress: "0x1234" }), "invalid_address");
  const [row] = await sql`SELECT payout_address FROM merchants WHERE id = ${merchant.id}`;
  assert.equal(row.payout_address, null);
});

// ── API keys ────────────────────────────────────────────────────────────────

test("listApiKeys muestra prefijo y estado, nunca la clave ni su hash", async () => {
  const merchant = await ensureMerchant(clerkId(), "k@example.com");
  await createApiKey(merchant.id, false);
  const keys = await listApiKeys({ merchantId: merchant.id, livemode: false });
  assert.equal(keys.length, 1);
  assert.match(keys[0].prefix, /^sk_test_/);
  assert.equal(keys[0].revoked, false);
  assert.equal("key_hash" in keys[0], false);
});

test("revokeApiKey deja la clave inútil y solo funciona con claves propias", async () => {
  const merchant = await ensureMerchant(clerkId(), "k@example.com");
  const other = await ensureMerchant(clerkId(), "o@example.com");
  const key = await createApiKey(merchant.id, false);
  const [{ id }] = await listApiKeys({ merchantId: merchant.id, livemode: false });
  assert.equal(await revokeApiKey(other.id, id), false); // de otro comercio: no
  assert.ok(await authenticate(bearer(key)));
  assert.equal(await revokeApiKey(merchant.id, id), true);
  assert.equal(await authenticate(bearer(key)), null);
});

// ── Payment links ───────────────────────────────────────────────────────────

test("listPaymentLinks y setPaymentLinkActive (solo los propios)", async () => {
  const merchant = await ensureMerchant(clerkId(), "l@example.com");
  const other = await ensureMerchant(clerkId(), "o@example.com");
  const auth = { merchantId: merchant.id, livemode: false };
  const id = await createPaymentLink(auth, { title: "Ebook", amount: 5_000_000n, currency: "usdc" });
  const [link] = await listPaymentLinks(auth);
  assert.deepEqual({ id: link.id, title: link.title, amount: link.amount, active: link.active }, { id, title: "Ebook", amount: 5_000_000n, active: true });
  assert.equal(await setPaymentLinkActive({ merchantId: other.id, livemode: false }, id, false), false);
  assert.equal(await setPaymentLinkActive(auth, id, false), true);
  assert.equal((await listPaymentLinks(auth))[0].active, false);
});

// ── Reenviar un aviso ───────────────────────────────────────────────────────

test("resendEvent vuelve a poner en cola un aviso fallido (solo propio y solo si falló)", async () => {
  const merchant = await ensureMerchant(clerkId(), "e@example.com");
  const other = await ensureMerchant(clerkId(), "o@example.com");
  const auth = { merchantId: merchant.id, livemode: false };
  const id = newId("evt");
  await sql`INSERT INTO events (id, merchant_id, livemode, type, data, delivery_status, attempts, last_error, next_attempt_at)
            VALUES (${id}, ${merchant.id}, false, 'payment_intent.succeeded', '{}', 'failed', 8, 'HTTP 500', now() + interval '1 day')`;
  assert.equal(await resendEvent({ merchantId: other.id, livemode: false }, id), false);
  assert.equal(await resendEvent(auth, id), true);
  const [event] = await sql`SELECT delivery_status, attempts, next_attempt_at <= now() AS due FROM events WHERE id = ${id}`;
  assert.deepEqual({ ...event }, { delivery_status: "pending", attempts: 0, due: true });
  assert.equal(await resendEvent(auth, id), false); // ya está pendiente
});

test("updateProfile con el nombre vacío lo deja sin nombre (el checkout mostrará \"Instanta\")", async () => {
  const merchant = await ensureMerchant(clerkId(), "n@example.com");
  await updateProfile(merchant.id, { name: "   ", payoutAddress: "0xAE76BEEdd8DD39878D22E1b7a8Ff96e5c5e8B17b" });
  const [row] = await sql`SELECT name FROM merchants WHERE id = ${merchant.id}`;
  assert.equal(row.name, null);
});
