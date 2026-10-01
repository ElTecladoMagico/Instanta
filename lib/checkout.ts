// Operaciones públicas del checkout (ADR-010). No usan API key: se identifican con el client_secret
// del pago, del que solo se guarda el hash, así que se busca por sha256(client_secret).
import { z } from "zod";
import { sql } from "./db.ts";
import { sha256 } from "./ids.ts";
import { checkPayment } from "./settle.ts";
import type { Row } from "./payment-intents.ts";

// Solo se lee tx_hash; cualquier otro campo (importe, destino…) se ignora (ADR-004, T5).
export const SubmitParams = z.object({
  tx_hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, "must be a 0x-prefixed 32-byte hex hash"),
});

type CheckoutRow = Row & { merchant_name: string | null };

// Vista pública del pago: lo necesario para pagar, sin metadata ni datos privados del comercio.
export function toSession(row: CheckoutRow) {
  return {
    id: row.id,
    amount: row.amount.toString(),
    currency: row.currency,
    status: row.status,
    failure_code: row.failure_code,
    pay_to: row.pay_to,
    chain_id: row.chain_id,
    token_address: row.token_address,
    merchant_name: row.merchant_name ?? "Instanta",
    description: row.description,
    tx_hash: row.tx_hash,
    return_url: row.return_url,
    expires_at: Math.floor(row.expires_at.getTime() / 1000),
  };
}

async function findBySecret(clientSecret: string): Promise<CheckoutRow | null> {
  const hash = sha256(clientSecret);
  // Caducidad perezosa (ADR-007), igual que en la API del comercio.
  await sql`
    UPDATE payment_intents SET status = 'expired'
    WHERE client_secret_hash = ${hash} AND status = 'requires_payment' AND expires_at < now()`;
  const [row] = await sql<CheckoutRow[]>`
    SELECT pi.*, m.name AS merchant_name
    FROM payment_intents pi JOIN merchants m ON m.id = pi.merchant_id
    WHERE pi.client_secret_hash = ${hash}`;
  return row ?? null;
}

// Datos del pago para la página de checkout. Si está en processing, aprovecha para comprobarlo en la cadena.
export async function getCheckout(clientSecret: string): Promise<CheckoutRow | null> {
  const row = await findBySecret(clientSecret);
  if (!row) return null;
  return { ...(await checkPayment(row)), merchant_name: row.merchant_name };
}

// El comprador envía el hash de su transacción. Solo se acepta en requires_payment y antes de caducar;
// UNIQUE(tx_hash) impide que una transacción pague dos pagos (ADR-004, T2).
export async function submitTransaction(
  clientSecret: string,
  txHash: string,
): Promise<CheckoutRow | "not_found" | "unexpected_state" | "tx_already_used"> {
  try {
    const [updated] = await sql`
      UPDATE payment_intents SET status = 'processing', tx_hash = ${txHash.toLowerCase()}
      WHERE client_secret_hash = ${sha256(clientSecret)} AND status = 'requires_payment' AND expires_at > now()
      RETURNING id`;
    if (!updated) return (await findBySecret(clientSecret)) ? "unexpected_state" : "not_found";
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return "tx_already_used"; // viola UNIQUE(tx_hash)
    throw err;
  }
  return (await getCheckout(clientSecret))!; // comprueba la transacción en la cadena al momento
}
