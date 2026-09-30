// API keys (ADR-006): formato, se guardan solo como hash y autentican peticiones. Necesita la BD migrada.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { sql } from "../lib/db.ts";
import { newId } from "../lib/ids.ts";
import { authenticate, createApiKey, generateApiKey } from "../lib/api-keys.ts";

after(() => sql.end());

async function newMerchant(): Promise<string> {
  const id = newId("mer");
  await sql`INSERT INTO merchants (id, clerk_user_id, email) VALUES (${id}, ${id}, 'keys@example.com')`;
  return id;
}

const request = (authorization?: string) =>
  new Request("http://localhost/v1/anything", { headers: authorization ? { authorization } : {} });

test("generateApiKey: sk_test_ o sk_live_ + 43 caracteres base64url (32 bytes aleatorios)", () => {
  assert.match(generateApiKey(false).key, /^sk_test_[A-Za-z0-9_-]{43}$/);
  assert.match(generateApiKey(true).key, /^sk_live_[A-Za-z0-9_-]{43}$/);
});

test("generateApiKey: el hash es el SHA-256 de la clave y el prefijo visible son sus 12 primeros caracteres", () => {
  const { key, hash, prefix } = generateApiKey(false);
  assert.equal(hash, createHash("sha256").update(key).digest("hex"));
  assert.equal(prefix, key.slice(0, 12));
});

test("createApiKey devuelve la clave una vez y en la BD solo queda su hash (ADR-004, T7)", async () => {
  const merchant = await newMerchant();
  const key = await createApiKey(merchant, false);
  const rows = await sql`SELECT * FROM api_keys WHERE merchant_id = ${merchant}`;
  assert.equal(rows.length, 1);
  assert.ok(!JSON.stringify(rows[0]).includes(key), "la clave en claro no debe aparecer en ninguna columna");
  assert.equal(rows[0].key_hash, createHash("sha256").update(key).digest("hex"));
});

test("authenticate: una clave válida identifica al comercio y el modo", async () => {
  const merchant = await newMerchant();
  const testKey = await createApiKey(merchant, false);
  const liveKey = await createApiKey(merchant, true);
  assert.deepEqual(await authenticate(request(`Bearer ${testKey}`)), { merchantId: merchant, livemode: false });
  assert.deepEqual(await authenticate(request(`Bearer ${liveKey}`)), { merchantId: merchant, livemode: true });
});

test("authenticate: sin cabecera, con otro esquema o con una clave inventada → null", async () => {
  assert.equal(await authenticate(request()), null);
  assert.equal(await authenticate(request("Basic dXNlcjpwYXNz")), null);
  assert.equal(await authenticate(request(`Bearer ${generateApiKey(false).key}`)), null);
});

test("authenticate: una clave revocada deja de funcionar", async () => {
  const merchant = await newMerchant();
  const key = await createApiKey(merchant, false);
  await sql`UPDATE api_keys SET revoked_at = now() WHERE merchant_id = ${merchant}`;
  assert.equal(await authenticate(request(`Bearer ${key}`)), null);
});
