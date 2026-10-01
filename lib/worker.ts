// Una vuelta del worker (ADR-003, ADR-009): el trabajo que no depende de que alguien llame a la API.
// worker/main.ts la repite cada pocos segundos. Cada paso es independiente: si el nodo de la blockchain
// falla, los pagos esperan a la siguiente vuelta, pero los avisos se siguen enviando.
import { sql } from "./db.ts";
import { expirePayments, type Row } from "./payment-intents.ts";
import { checkPayment } from "./settle.ts";
import { deliverPendingEvents } from "./webhooks.ts";

export async function runOnce(): Promise<void> {
  // 1. Caducar los pagos sin pagar que pasaron de expires_at (con su evento).
  await expirePayments("all");

  // 2. Comprobar en la cadena los pagos en processing (los más antiguos primero).
  const processing = await sql<Row[]>`SELECT * FROM payment_intents WHERE status = 'processing' ORDER BY created_at LIMIT 50`;
  for (const row of processing) await checkPayment(row);

  // 3. Enviar los avisos pendientes a los comercios.
  await deliverPendingEvents();
}
