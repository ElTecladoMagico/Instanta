// Envío de webhooks (ADR-009): firma HMAC, entrega al menos una vez, reintentos y protección SSRF.
// Un servidor HTTP local hace de servidor del comercio. Necesita la BD migrada.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { createHmac } from "node:crypto";
import { sql } from "../lib/db.ts";
import { newId } from "../lib/ids.ts";
import { deliverPendingEvents, signPayload, verifySignature } from "../lib/webhooks.ts";

process.env.WEBHOOK_ALLOW_PRIVATE_HOSTS = "1"; // el servidor del comercio de los tests está en 127.0.0.1

type Received = { headers: Record<string, string | string[] | undefined>; body: string };
let shop: Server;
let shopUrl = "";
let received: Received[] = [];
let reply = 200;

before(async () => {
  shop = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      received.push({ headers: req.headers, body });
      if (reply === 302) return res.writeHead(302, { location: "http://127.0.0.1:1/internal" }).end();
      res.writeHead(reply).end();
    });
  });
  await new Promise<void>((resolve) => shop.listen(0, "127.0.0.1", resolve));
  shopUrl = `http://127.0.0.1:${(shop.address() as { port: number }).port}/webhook`;
});
after(async () => {
  shop.close();
  await sql.end();
});

// Un comercio con su endpoint y un evento pendiente de enviar.
async function pendingEvent({ endpoint = true as boolean, enabled = true, url = "", attempts = 0 } = {}) {
  // El envío toma los eventos pendientes más antiguos de toda la BD: se retiran los que hayan dejado
  // otros tests para que este caso no dependa de lo que haya en la base de datos.
  await sql`UPDATE events SET delivery_status = 'failed' WHERE delivery_status = 'pending'`;
  const merchantId = newId("mer");
  await sql`INSERT INTO merchants (id, clerk_user_id, email) VALUES (${merchantId}, ${merchantId}, 'deliver@example.com')`;
  const secret = "whsec_test_" + merchantId;
  if (endpoint) {
    await sql`INSERT INTO webhook_endpoints (id, merchant_id, livemode, url, secret, enabled)
              VALUES (${newId("we")}, ${merchantId}, false, ${url || shopUrl}, ${secret}, ${enabled})`;
  }
  const id = newId("evt");
  await sql`INSERT INTO events (id, merchant_id, livemode, type, data, attempts)
            VALUES (${id}, ${merchantId}, false, 'payment_intent.succeeded',
                    ${sql.json({ object: { id: "pi_x", object: "payment_intent", status: "succeeded" } })}, ${attempts})`;
  received = [];
  reply = 200;
  return { id, secret };
}
const stored = async (id: string) => (await sql`SELECT * FROM events WHERE id = ${id}`)[0];

// ── Firma ───────────────────────────────────────────────────────────────────

test("signPayload: t=<unix>,v1=<HMAC-SHA256(secret, t + '.' + cuerpo) en hex>", () => {
  const expected = createHmac("sha256", "whsec_x").update('1790000000.{"a":1}').digest("hex");
  assert.equal(signPayload("whsec_x", 1790000000, '{"a":1}'), `t=1790000000,v1=${expected}`);
});

test("verifySignature: acepta la firma correcta y rechaza cuerpo manipulado, otro secreto, firma antigua o mal formada", () => {
  const now = 1790000000;
  const header = signPayload("whsec_x", now, '{"a":1}');
  assert.equal(verifySignature("whsec_x", header, '{"a":1}', now), true);
  assert.equal(verifySignature("whsec_x", header, '{"a":2}', now), false); // cuerpo manipulado
  assert.equal(verifySignature("whsec_y", header, '{"a":1}', now), false); // otro secreto
  assert.equal(verifySignature("whsec_x", header, '{"a":1}', now + 301), false); // más de 5 minutos: posible repetición
  assert.equal(verifySignature("whsec_x", "basura", '{"a":1}', now), false);
});

// ── Entrega ─────────────────────────────────────────────────────────────────

test("el comercio responde 200 → delivered; el aviso va firmado y lleva el evento", async () => {
  const { id, secret } = await pendingEvent();
  await deliverPendingEvents();
  const event = await stored(id);
  assert.equal(event.delivery_status, "delivered");
  assert.equal(event.attempts, 1);

  const request = received.find((r) => r.body.includes(id))!;
  assert.equal(request.headers["content-type"], "application/json");
  assert.equal(verifySignature(secret, String(request.headers["instanta-signature"]), request.body), true);
  const body = JSON.parse(request.body);
  assert.equal(body.id, id);
  assert.equal(body.object, "event");
  assert.equal(body.type, "payment_intent.succeeded");
  assert.equal(body.data.object.id, "pi_x");
  assert.equal(body.delivery_status, undefined); // eso es interno, no va en el aviso
});

test("el comercio responde 500 → sigue pending, reintento en 1 minuto y se guarda el error", async () => {
  const { id } = await pendingEvent();
  reply = 500;
  await deliverPendingEvents();
  const event = await stored(id);
  assert.equal(event.delivery_status, "pending");
  assert.equal(event.attempts, 1);
  assert.equal(event.last_error, "HTTP 500");
  const waitSeconds = (event.next_attempt_at.getTime() - Date.now()) / 1000;
  // Margen de ±10 s: el reloj de Postgres (en la VM de Docker) y el del test pueden ir algo desfasados.
  assert.ok(waitSeconds > 50 && waitSeconds < 70, `espera de ${waitSeconds} s`);
});

test("tras el octavo intento fallido → failed (no se reintenta más)", async () => {
  const { id } = await pendingEvent({ attempts: 7 });
  reply = 500;
  await deliverPendingEvents();
  const event = await stored(id);
  assert.equal(event.delivery_status, "failed");
  assert.equal(event.attempts, 8);
});

test("sin endpoint registrado → failed sin enviar nada", async () => {
  const { id } = await pendingEvent({ endpoint: false });
  await deliverPendingEvents();
  const event = await stored(id);
  assert.equal(event.delivery_status, "failed");
  assert.match(event.last_error, /no webhook endpoint/i);
  assert.equal(received.length, 0);
});

test("endpoint desactivado → como si no hubiera", async () => {
  const { id } = await pendingEvent({ enabled: false });
  await deliverPendingEvents();
  assert.equal((await stored(id)).delivery_status, "failed");
  assert.equal(received.length, 0);
});

test("una redirección no se sigue (podría apuntar a la red interna) y cuenta como fallo", async () => {
  const { id } = await pendingEvent();
  reply = 302;
  await deliverPendingEvents();
  const event = await stored(id);
  assert.equal(event.delivery_status, "pending");
  assert.equal(event.last_error, "HTTP 302");
  assert.equal(received.length, 1); // solo la petición original, no la redirección
});

test("servidor del comercio caído → se anota el error y se reintenta, sin lanzar excepción", async () => {
  const { id } = await pendingEvent({ url: "http://127.0.0.1:1/webhook" });
  await deliverPendingEvents();
  const event = await stored(id);
  assert.equal(event.delivery_status, "pending");
  assert.equal(event.attempts, 1);
  assert.ok(event.last_error);
});

test("dos workers a la vez → cada aviso se envía una sola vez", async () => {
  const { id } = await pendingEvent();
  await Promise.all([deliverPendingEvents(), deliverPendingEvents()]);
  assert.equal(received.filter((r) => r.body.includes(id)).length, 1);
});

test("URL privada guardada en la BD (SSRF) → no se envía y se anota el motivo", async () => {
  const { id } = await pendingEvent();
  delete process.env.WEBHOOK_ALLOW_PRIVATE_HOSTS; // ahora 127.0.0.1 cuenta como privada
  try {
    await deliverPendingEvents();
  } finally {
    process.env.WEBHOOK_ALLOW_PRIVATE_HOSTS = "1";
  }
  assert.equal(received.length, 0);
  assert.match((await stored(id)).last_error, /not public/i);
});
