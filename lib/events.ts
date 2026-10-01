// Patrón outbox (ADR-009): el evento del webhook se guarda en la MISMA transacción de la base de datos
// que el cambio de estado del pago. O se guardan los dos, o ninguno: nunca hay un pago completado sin su aviso.
// El worker envía después los eventos pendientes (lib/webhooks.ts).
import type { TransactionSql } from "postgres";
import { newId } from "./ids.ts";
import { toApi, type Row } from "./payment-intents.ts";

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
