// Tienda de ejemplo (ADR-012): el lado del comercio. Comprueba que la verificación que hace un comercio
// (sin usar el código de Instanta) acepta las firmas que genera Instanta y gestiona bien los avisos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { signPayload } from "../lib/webhooks.ts";
import { createOrder, createStore, handleWebhook } from "../examples/demo-store/store.ts";

const SECRET = "whsec_demo_test";
const now = 1790000000;

function webhook(type: string, orderId: string, eventId = "evt_" + Math.random().toString(16).slice(2)) {
  const body = JSON.stringify({ id: eventId, object: "event", type, data: { object: { id: "pi_x", metadata: { order_id: orderId } } } });
  return { body, header: signPayload(SECRET, now, body), eventId };
}

test("un aviso firmado de pago completado marca el pedido como pagado", () => {
  const store = createStore();
  const order = createOrder(store);
  const { body, header } = webhook("payment_intent.succeeded", order.id);
  assert.equal(handleWebhook(store, SECRET, header, body, now), 200);
  assert.equal(order.status, "paid");
});

test("una firma falsa, de otro secreto o antigua se rechaza con 400 y el pedido no cambia", () => {
  const store = createStore();
  const order = createOrder(store);
  const { body, header } = webhook("payment_intent.succeeded", order.id);
  assert.equal(handleWebhook(store, SECRET, header.replace(/.$/, "0"), body, now), 400);
  assert.equal(handleWebhook(store, "whsec_otro", header, body, now), 400);
  assert.equal(handleWebhook(store, SECRET, header, body, now + 301), 400);
  assert.equal(handleWebhook(store, SECRET, "", body, now), 400);
  assert.equal(order.status, "pending");
});

test("un aviso repetido (mismo event.id) se acepta pero solo se procesa una vez", () => {
  const store = createStore();
  const order = createOrder(store);
  const paid = webhook("payment_intent.succeeded", order.id, "evt_once");
  assert.equal(handleWebhook(store, SECRET, paid.header, paid.body, now), 200);
  order.status = "shipped"; // la tienda siguió con el pedido
  assert.equal(handleWebhook(store, SECRET, paid.header, paid.body, now), 200);
  assert.equal(order.status, "shipped"); // el aviso repetido no lo devuelve a "paid"
});

test("pagos fallidos, caducados o cancelados se reflejan en el pedido", () => {
  const store = createStore();
  for (const [type, status] of [
    ["payment_intent.failed", "failed"],
    ["payment_intent.expired", "expired"],
    ["payment_intent.canceled", "canceled"],
  ]) {
    const order = createOrder(store);
    const { body, header } = webhook(type, order.id);
    handleWebhook(store, SECRET, header, body, now);
    assert.equal(order.status, status);
  }
});

test("un aviso de un pedido que la tienda no conoce se acepta (200) y se ignora", () => {
  const store = createStore();
  const { body, header } = webhook("payment_intent.succeeded", "ord_desconocido");
  assert.equal(handleWebhook(store, SECRET, header, body, now), 200);
});

test("createOrder genera ids distintos y empieza pendiente", () => {
  const store = createStore();
  const a = createOrder(store);
  const b = createOrder(store);
  assert.notEqual(a.id, b.id);
  assert.equal(a.status, "pending");
  assert.equal(store.orders.get(a.id), a);
});
