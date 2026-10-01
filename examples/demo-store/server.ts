// Tienda de ejemplo (ADR-012): lo mínimo que necesita un comercio para cobrar con Instanta.
// Sin dependencias: node:http y fetch. Se ejecuta con `node server.ts` (Node 24).
// Variables: INSTANTA_API_URL, INSTANTA_API_KEY (sk_test_…), INSTANTA_WEBHOOK_SECRET (whsec_…),
//            PUBLIC_URL (dirección pública de la tienda, p. ej. https://instanta.scuda.es/demo) y PORT.
import { createServer } from "node:http";
import { createOrder, createStore, handleWebhook } from "./store.ts";

const API_URL = process.env.INSTANTA_API_URL ?? "https://instanta.scuda.es";
const API_KEY = process.env.INSTANTA_API_KEY ?? "";
const WEBHOOK_SECRET = process.env.INSTANTA_WEBHOOK_SECRET ?? "";
const PUBLIC_URL = process.env.PUBLIC_URL ?? "http://localhost:4000";
const PRODUCT = { name: "Café de especialidad", amount: "10000", price: "0.01 USDC" }; // USDC tiene 6 decimales

const store = createStore();
const page = (body: string, refresh = false) =>
  `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width">${refresh ? '<meta http-equiv="refresh" content="3">' : ""}<title>Tienda de ejemplo</title><body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem;line-height:1.5"><p style="color:#777">Tienda de ejemplo · integrada con Instanta</p>${body}</body></html>`;

createServer(async (req, res) => {
  const path = new URL(req.url ?? "/", "http://local").pathname;
  const send = (status: number, html: string, headers: Record<string, string> = {}) =>
    res.writeHead(status, { "content-type": "text/html; charset=utf-8", ...headers }).end(html);

  // 1. Página del producto.
  if (req.method === "GET" && path === "/") {
    return send(200, page(`<h1>${PRODUCT.name}</h1><p>Precio: <b>${PRODUCT.price}</b> (Base Sepolia)</p>
      <form method="post" action="${PUBLIC_URL}/buy"><button style="padding:.8rem 1.6rem">Comprar</button></form>`));
  }

  // 2. Comprar. El SERVIDOR de la tienda crea el pago con su API key (nunca el navegador), guarda su número
  //    de pedido en metadata y manda al comprador al checkout de Instanta.
  if (req.method === "POST" && path === "/buy") {
    const order = createOrder(store);
    const response = await fetch(`${API_URL}/v1/payment_intents`, {
      method: "POST",
      headers: { authorization: `Bearer ${API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        amount: PRODUCT.amount,
        currency: "usdc",
        description: PRODUCT.name,
        metadata: { order_id: order.id },
        return_url: `${PUBLIC_URL}/orders/${order.id}`, // a dónde vuelve el comprador al terminar
      }),
    });
    if (!response.ok) return send(502, page(`<p>No se pudo crear el pago (HTTP ${response.status}).</p>`));
    const payment = await response.json();
    order.paymentId = payment.id;
    return send(303, "", { location: payment.checkout_url });
  }

  // 3. Estado del pedido. Se recarga cada 3 s hasta que llega el aviso de Instanta.
  const orderMatch = path.match(/^\/orders\/(ord_[0-9a-f]+)$/);
  if (req.method === "GET" && orderMatch) {
    const order = store.orders.get(orderMatch[1]);
    if (!order) return send(404, page("<p>Pedido no encontrado.</p>"));
    const text = order.status === "paid" ? "✅ Pagado. ¡Gracias por tu compra!" : order.status === "pending" ? "⏳ Esperando el aviso de pago…" : `❌ ${order.status}`;
    return send(200, page(`<h1>Pedido ${order.id}</h1><p>${text}</p><p><a href="${PUBLIC_URL}/">Volver a la tienda</a></p>`, order.status === "pending"));
  }

  // 4. Aviso de Instanta (webhook): se lee el cuerpo tal cual, porque la firma se calcula sobre esos bytes.
  if (req.method === "POST" && path === "/webhook") {
    let body = "";
    for await (const chunk of req) body += chunk;
    const status = handleWebhook(store, WEBHOOK_SECRET, String(req.headers["instanta-signature"] ?? ""), body);
    return res.writeHead(status).end();
  }

  send(404, page("<p>No encontrado.</p>"));
}).listen(Number(process.env.PORT ?? 4000), () => console.log(`tienda de ejemplo en ${PUBLIC_URL}`));
