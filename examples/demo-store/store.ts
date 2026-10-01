// Tienda de ejemplo: la lógica del lado del COMERCIO (ADR-012). No usa el código de Instanta, igual que
// un comercio real: verifica la firma de los avisos con su propio código (el de la documentación).
// Los pedidos se guardan en memoria: es una demo; una tienda real usaría su base de datos.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type Order = { id: string; status: "pending" | "paid" | "failed" | "expired" | "canceled" | "shipped"; paymentId?: string };
export type Store = { orders: Map<string, Order>; processedEvents: Set<string> };

export const createStore = (): Store => ({ orders: new Map(), processedEvents: new Set() });

export function createOrder(store: Store): Order {
  const order: Order = { id: "ord_" + randomBytes(8).toString("hex"), status: "pending" };
  store.orders.set(order.id, order);
  return order;
}

// Instanta-Signature: t=<unix>,v1=<HMAC-SHA256(secreto, t + "." + cuerpo)>. Se rechaza si tiene más de 5 minutos.
function isFromInstanta(secret: string, header: string, body: string, now: number): boolean {
  const match = header.match(/^t=(\d+),v1=([0-9a-f]{64})$/);
  if (!match || Math.abs(now - Number(match[1])) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${match[1]}.${body}`).digest();
  return timingSafeEqual(expected, Buffer.from(match[2], "hex"));
}

const NEW_STATUS: Record<string, Order["status"]> = {
  "payment_intent.succeeded": "paid",
  "payment_intent.failed": "failed",
  "payment_intent.expired": "expired",
  "payment_intent.canceled": "canceled",
};

// Procesa un aviso de Instanta. Devuelve el código HTTP con el que responder.
export function handleWebhook(store: Store, secret: string, header: string, body: string, now = Math.floor(Date.now() / 1000)): number {
  if (!isFromInstanta(secret, header, body, now)) return 400;
  const event = JSON.parse(body);
  // Instanta puede repetir un aviso (entrega "al menos una vez"): se procesa cada event.id una sola vez.
  if (store.processedEvents.has(event.id)) return 200;
  store.processedEvents.add(event.id);
  const order = store.orders.get(event.data.object.metadata?.order_id);
  if (order && NEW_STATUS[event.type]) order.status = NEW_STATUS[event.type];
  return 200; // también si no conocemos el pedido: así Instanta no lo reintenta
}
