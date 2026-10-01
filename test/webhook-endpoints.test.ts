// /v1/webhook_endpoints (ADR-009): dónde quiere recibir el comercio los avisos. Necesita la BD migrada.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { sql } from "../lib/db.ts";
import { newId } from "../lib/ids.ts";
import { createApiKey } from "../lib/api-keys.ts";
import * as collection from "../src/app/v1/webhook_endpoints/route.ts";
import * as single from "../src/app/v1/webhook_endpoints/[id]/route.ts";

after(() => sql.end());

const PUBLIC_URL = "https://1.1.1.1/instanta/webhook"; // IP pública: no depende del DNS en los tests

async function merchantKey(livemode = false) {
  const id = newId("mer");
  await sql`INSERT INTO merchants (id, clerk_user_id, email) VALUES (${id}, ${id}, 'wh@example.com')`;
  return createApiKey(id, livemode);
}

const req = (method: string, path: string, key?: string, body?: unknown) =>
  new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const create = (key: string, url: string) => collection.POST(req("POST", "/v1/webhook_endpoints", key, { url }));
const list = (key: string) => collection.GET(req("GET", "/v1/webhook_endpoints", key));
const remove = (key: string, id: string) => single.DELETE(req("DELETE", `/v1/webhook_endpoints/${id}`, key), { params: Promise.resolve({ id }) });

test("sin API key → 401 en todos los endpoints", async () => {
  const statuses = await Promise.all([
    collection.POST(req("POST", "/v1/webhook_endpoints", undefined, { url: PUBLIC_URL })),
    collection.GET(req("GET", "/v1/webhook_endpoints")),
    single.DELETE(req("DELETE", "/v1/webhook_endpoints/we_x"), { params: Promise.resolve({ id: "we_x" }) }),
  ]);
  assert.deepEqual(statuses.map((r) => r.status), [401, 401, 401]);
});

test("crear → 201 con el secreto de firma, que solo se muestra esta vez", async () => {
  const key = await merchantKey();
  const res = await create(key, PUBLIC_URL);
  assert.equal(res.status, 201);
  const endpoint = await res.json();
  assert.match(endpoint.id, /^we_[0-9a-f]{32}$/);
  assert.equal(endpoint.object, "webhook_endpoint");
  assert.equal(endpoint.livemode, false);
  assert.equal(endpoint.url, PUBLIC_URL);
  assert.equal(endpoint.enabled, true);
  assert.match(endpoint.secret, /^whsec_[A-Za-z0-9_-]{43}$/);
  assert.equal(typeof endpoint.created, "number");

  const page = await (await list(key)).json();
  assert.equal(page.object, "list");
  assert.deepEqual(page.data.map((e: { id: string }) => e.id), [endpoint.id]);
  assert.equal(page.data[0].secret, undefined); // al listar ya no aparece
});

test("un segundo endpoint para el mismo comercio y modo → 409", async () => {
  const key = await merchantKey();
  await create(key, PUBLIC_URL);
  const res = await create(key, "https://8.8.8.8/hook");
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, "webhook_endpoint_exists");
});

const invalid: [string, string, boolean, string][] = [
  ["URL privada (SSRF)", "http://127.0.0.1:3000/hook", false, "url_not_public"],
  ["red interna de Docker (SSRF)", "http://172.18.0.2/hook", false, "url_not_public"],
  ["http en modo live", "http://1.1.1.1/hook", true, "parameter_invalid"],
  ["algo que no es una URL http(s)", "ftp://1.1.1.1/hook", false, "parameter_invalid"],
];
for (const [name, url, livemode, code] of invalid) {
  test(`crear rechaza ${name} → 400 ${code}`, async () => {
    const res = await create(await merchantKey(livemode), url);
    assert.equal(res.status, 400);
    const { error } = await res.json();
    assert.equal(error.code, code);
    assert.equal(error.param, "url");
  });
}

test("borrar → 200 deleted, y después se puede registrar otro", async () => {
  const key = await merchantKey();
  const { id } = await (await create(key, PUBLIC_URL)).json();
  const res = await remove(key, id);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { id, object: "webhook_endpoint", deleted: true });
  assert.equal((await create(key, PUBLIC_URL)).status, 201);
});

test("un comercio no ve ni borra los endpoints de otro (ADR-004, T6)", async () => {
  const a = await merchantKey();
  const b = await merchantKey();
  const { id } = await (await create(a, PUBLIC_URL)).json();
  assert.equal((await (await list(b)).json()).data.length, 0);
  assert.equal((await remove(b, id)).status, 404);
  assert.equal((await (await list(a)).json()).data.length, 1);
});

test("crear con un cuerpo que no es JSON → 400", async () => {
  const key = await merchantKey();
  const res = await collection.POST(
    new Request("http://localhost/v1/webhook_endpoints", { method: "POST", headers: { authorization: `Bearer ${key}` }, body: "no json" }),
  );
  assert.equal(res.status, 400);
});
