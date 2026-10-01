// /v1/events: el historial de avisos del comercio, con su estado de entrega. Necesita la BD migrada.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { sql } from "../lib/db.ts";
import { newId } from "../lib/ids.ts";
import { createApiKey } from "../lib/api-keys.ts";
import * as collection from "../src/app/v1/events/route.ts";
import * as single from "../src/app/v1/events/[id]/route.ts";

after(() => sql.end());

async function merchant(livemode = false) {
  const id = newId("mer");
  await sql`INSERT INTO merchants (id, clerk_user_id, email) VALUES (${id}, ${id}, 'evapi@example.com')`;
  return { id, key: await createApiKey(id, livemode) };
}

async function insertEvent(merchantId: string, type = "payment_intent.succeeded", livemode = false) {
  const id = newId("evt");
  await sql`INSERT INTO events (id, merchant_id, livemode, type, data)
            VALUES (${id}, ${merchantId}, ${livemode}, ${type}, ${sql.json({ object: { id: "pi_x", object: "payment_intent" } })})`;
  return id;
}

const auth = (key?: string): Record<string, string> => (key ? { authorization: `Bearer ${key}` } : {});
const list = (key: string, query = "") => collection.GET(new Request(`http://localhost/v1/events${query}`, { headers: auth(key) }));
const get = (key: string | undefined, id: string) =>
  single.GET(new Request(`http://localhost/v1/events/${id}`, { headers: auth(key) }), { params: Promise.resolve({ id }) });

test("consultar un evento → el objeto event con su estado de entrega", async () => {
  const m = await merchant();
  const id = await insertEvent(m.id);
  const res = await get(m.key, id);
  assert.equal(res.status, 200);
  const event = await res.json();
  assert.equal(event.id, id);
  assert.equal(event.object, "event");
  assert.equal(event.livemode, false);
  assert.equal(event.type, "payment_intent.succeeded");
  assert.equal(typeof event.created, "number");
  assert.deepEqual(event.data, { object: { id: "pi_x", object: "payment_intent" } });
  assert.equal(event.delivery_status, "pending");
});

test("listar: más recientes primero, con paginación y filtro por tipo", async () => {
  const m = await merchant();
  const ids = [];
  for (const type of ["payment_intent.succeeded", "payment_intent.failed", "payment_intent.succeeded"]) ids.unshift(await insertEvent(m.id, type));
  const page1 = await (await list(m.key, "?limit=2")).json();
  const page2 = await (await list(m.key, `?limit=2&starting_after=${page1.data[1].id}`)).json();
  assert.deepEqual([...page1.data, ...page2.data].map((e: { id: string }) => e.id), ids);
  assert.deepEqual([page1.has_more, page2.has_more], [true, false]);
  const failed = await (await list(m.key, "?type=payment_intent.failed")).json();
  assert.deepEqual(failed.data.map((e: { type: string }) => e.type), ["payment_intent.failed"]);
});

test("tipo o limit inválidos → 400", async () => {
  const m = await merchant();
  assert.equal((await list(m.key, "?type=payment_intent.paid")).status, 400);
  assert.equal((await list(m.key, "?limit=0")).status, 400);
});

test("un comercio no ve los eventos de otro, ni test los de live (ADR-004, T6)", async () => {
  const a = await merchant();
  const b = await merchant();
  const id = await insertEvent(a.id);
  const liveKey = await createApiKey(a.id, true);
  assert.equal((await get(b.key, id)).status, 404);
  assert.equal((await get(liveKey, id)).status, 404);
  assert.equal((await (await list(b.key)).json()).data.length, 0);
});

test("sin API key → 401", async () => {
  assert.equal((await get(undefined, "evt_x")).status, 401);
  assert.equal((await collection.GET(new Request("http://localhost/v1/events"))).status, 401);
});
