// Envío de webhooks (ADR-009). El worker llama a deliverPendingEvents() cada pocos segundos.
// Cada aviso es un POST firmado al servidor del comercio. Entrega "al menos una vez": si falla se reintenta,
// así que el comercio puede recibir un aviso repetido y debe ignorar los event.id que ya procesó.
import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "./db.ts";
import { isPublicUrl } from "./ssrf.ts";

const MAX_ATTEMPTS = 8;
// Espera antes de cada reintento, en minutos: 1, 5, 30, 2 h y después cada 12 h (unos 2 días en total).
const RETRY_MINUTES = [1, 5, 30, 120, 720, 720, 720];
const TIMEOUT_MS = 10_000;
const SIGNATURE_TOLERANCE_SECONDS = 300;

// ── Firma ───────────────────────────────────────────────────────────────────
// Igual que Stripe: Instanta-Signature: t=<unix>,v1=<HMAC-SHA256(secreto, t + "." + cuerpo)>.
// La marca de tiempo va dentro de lo firmado, así que no se puede reutilizar un aviso capturado más tarde.

export function signPayload(secret: string, timestamp: number, body: string): string {
  const v1 = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

// La comprobación que hace el comercio al recibir un aviso (ver docs/api y la tienda de ejemplo).
export function verifySignature(secret: string, header: string, body: string, now = Math.floor(Date.now() / 1000)): boolean {
  const match = header.match(/^t=(\d+),v1=([0-9a-f]{64})$/);
  if (!match) return false;
  const timestamp = Number(match[1]);
  if (Math.abs(now - timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest();
  // timingSafeEqual tarda lo mismo acierte o no: no da pistas sobre cuántos caracteres coinciden.
  return timingSafeEqual(expected, Buffer.from(match[2], "hex"));
}

// ── Entrega ─────────────────────────────────────────────────────────────────

type EventRow = { id: string; merchant_id: string; livemode: boolean; type: string; data: unknown; created_at: Date; attempts: number };

export async function deliverPendingEvents(limit = 20): Promise<void> {
  // Reservar los eventos que tocan: se adelanta su next_attempt_at 2 minutos. Otro worker no los toma
  // (FOR UPDATE SKIP LOCKED salta las filas que alguien está reservando) y, si este proceso se cae
  // a mitad, se reintentarán solos cuando venza la reserva. No hace falta Redis ni una librería de colas.
  const events = await sql<EventRow[]>`
    UPDATE events SET next_attempt_at = now() + interval '2 minutes'
    WHERE id IN (
      SELECT id FROM events
      WHERE delivery_status = 'pending' AND next_attempt_at <= now()
      ORDER BY created_at
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED)
    RETURNING *`;
  for (const event of events) await deliver(event);
}

async function deliver(event: EventRow) {
  const [endpoint] = await sql<{ url: string; secret: string }[]>`
    SELECT url, secret FROM webhook_endpoints
    WHERE merchant_id = ${event.merchant_id} AND livemode = ${event.livemode} AND enabled`;
  if (!endpoint) {
    await sql`UPDATE events SET delivery_status = 'failed', last_error = 'No webhook endpoint configured' WHERE id = ${event.id}`;
    return;
  }

  const error = await send(endpoint, event);
  const attempts = event.attempts + 1;
  if (error === null) {
    await sql`UPDATE events SET delivery_status = 'delivered', attempts = ${attempts}, last_error = NULL WHERE id = ${event.id}`;
  } else if (attempts >= MAX_ATTEMPTS) {
    await sql`UPDATE events SET delivery_status = 'failed', attempts = ${attempts}, last_error = ${error} WHERE id = ${event.id}`;
  } else {
    await sql`
      UPDATE events
      SET attempts = ${attempts}, last_error = ${error},
          next_attempt_at = now() + make_interval(mins => ${RETRY_MINUTES[attempts - 1]})
      WHERE id = ${event.id}`;
  }
}

// Hace el POST. Devuelve null si el comercio respondió 2xx, o el motivo del fallo.
async function send(endpoint: { url: string; secret: string }, event: EventRow): Promise<string | null> {
  // Se vuelve a comprobar aquí y no solo al registrar la URL: el DNS de su dominio puede haber cambiado.
  if (!(await isPublicUrl(endpoint.url))) return "URL is not public (SSRF protection)";
  const body = JSON.stringify({
    id: event.id,
    object: "event",
    livemode: event.livemode,
    type: event.type,
    created: Math.floor(event.created_at.getTime() / 1000),
    data: event.data,
  });
  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      redirect: "manual", // una redirección podría llevar a la red interna: no se sigue
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "content-type": "application/json",
        "user-agent": "Instanta-Webhooks/1.0",
        "instanta-signature": signPayload(endpoint.secret, Math.floor(Date.now() / 1000), body),
      },
      body,
    });
    return res.ok ? null : `HTTP ${res.status}`;
  } catch (err) {
    return (err as Error).message; // red caída, DNS, tiempo agotado…
  }
}
