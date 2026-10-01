// Patrón outbox (ADR-009): el evento del webhook se guarda en la MISMA transacción de la base de datos
// que el cambio de estado del pago. O se guardan los dos, o ninguno: nunca hay un pago completado sin su aviso.
// El worker envía después los eventos pendientes (lib/webhooks.ts).
import type { TransactionSql } from "postgres";
import { z } from "zod";
import { sql } from "./db.ts";
import { newId } from "./ids.ts";
import { toApi, type Row } from "./payment-intents.ts";
import type { Auth } from "./api-keys.ts";

export const EVENT_TYPES = [
  "payment_intent.succeeded",
  "payment_intent.failed",
  "payment_intent.canceled",
  "payment_intent.expired",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// tx: la transacción abierta con sql.begin() en la que se acaba de cambiar el estado del pago.
export async function recordEvent(tx: TransactionSql, row: Row, type: EventType): Promise<void> {
  await tx`
    INSERT INTO events (id, merchant_id, livemode, type, data)
    VALUES (${newId("evt")}, ${row.merchant_id}, ${row.livemode}, ${type}, ${tx.json({ object: toApi(row) })})`;
}

// ── Consulta del historial (/v1/events) ─────────────────────────────────────

export const EventListParams = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  starting_after: z.string().optional(),
  type: z.enum(EVENT_TYPES).optional(),
});

type EventRow = { id: string; livemode: boolean; type: EventType; data: unknown; created_at: Date; delivery_status: string };

export const eventToApi = (row: EventRow) => ({
  id: row.id,
  object: "event",
  livemode: row.livemode,
  type: row.type,
  created: Math.floor(row.created_at.getTime() / 1000),
  data: row.data,
  delivery_status: row.delivery_status,
});

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
