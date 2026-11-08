// Eventos de los pagos (ADR-009): tipos, historial (/v1/events) y reenvío desde el dashboard.
// Se guardan en la misma transacción que el cambio de estado del pago (outbox, en lib/payment-intents.ts)
// y el worker los envía después (lib/webhooks.ts).
import { z } from "zod";
import { sql } from "./db.ts";
import type { Auth } from "./api-keys.ts";

export const EVENT_TYPES = [
  "payment_intent.succeeded",
  "payment_intent.failed",
  "payment_intent.canceled",
  "payment_intent.expired",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// ── Consulta del historial (/v1/events) ─────────────────────────────────────

export const EventListParams = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  starting_after: z.string().optional(),
  type: z.enum(EVENT_TYPES).optional(),
});

export type EventRow = {
  id: string;
  merchant_id: string;
  livemode: boolean;
  type: EventType;
  data: unknown;
  created_at: Date;
  delivery_status: "pending" | "delivered" | "failed";
  attempts: number;
  next_attempt_at: Date;
  last_error: string | null;
};

// El evento tal como lo recibe el comercio en el webhook (cuerpo firmado, lib/webhooks.ts) y en la API.
// El orden de las claves forma parte del texto firmado: no cambiarlo.
export const eventPayload = (row: EventRow) => ({
  id: row.id,
  object: "event",
  livemode: row.livemode,
  type: row.type,
  created: Math.floor(row.created_at.getTime() / 1000),
  data: row.data,
});

// La API añade el estado del envío, que el webhook no lleva.
export const eventToApi = (row: EventRow) => ({ ...eventPayload(row), delivery_status: row.delivery_status });

export async function getEvent(auth: Auth, id: string): Promise<EventRow | null> {
  const [row] = await sql<EventRow[]>`
    SELECT * FROM events WHERE id = ${id} AND merchant_id = ${auth.merchantId} AND livemode = ${auth.livemode}`;
  return row ?? null;
}

// Igual que la lista de pagos: más recientes primero y paginación por cursor.
export async function listEvents(auth: Auth, params: z.infer<typeof EventListParams>) {
  const rows = await sql<EventRow[]>`
    SELECT * FROM events
    WHERE merchant_id = ${auth.merchantId} AND livemode = ${auth.livemode}
    ${params.type ? sql`AND type = ${params.type}` : sql``}
    ${
      params.starting_after
        ? sql`AND (created_at, id) < (SELECT created_at, id FROM events
                                      WHERE id = ${params.starting_after} AND merchant_id = ${auth.merchantId})`
        : sql``
    }
    ORDER BY created_at DESC, id DESC
    LIMIT ${params.limit + 1}`;
  return { rows: rows.slice(0, params.limit), hasMore: rows.length > params.limit };
}

// ── Reenvío desde el dashboard ────────────────────────────────────────────────
// Vuelve a poner en cola un aviso que agotó sus reintentos (p. ej. tras arreglar el servidor del comercio).
export async function resendEvent(auth: Auth, eventId: string): Promise<boolean> {
  const rows = await sql`
    UPDATE events SET delivery_status = 'pending', attempts = 0, last_error = NULL, next_attempt_at = now()
    WHERE id = ${eventId} AND merchant_id = ${auth.merchantId} AND livemode = ${auth.livemode}
      AND delivery_status = 'failed'
    RETURNING id`;
  return rows.length > 0;
}
