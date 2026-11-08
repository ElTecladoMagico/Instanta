// Operaciones públicas del checkout (ADR-010). No usan API key: se identifican con el client_secret
// del pago, del que solo se guarda el hash, así que se busca por sha256(client_secret).
import { z } from "zod";
import { sql } from "./db.ts";
import { sha256 } from "./ids.ts";
import { checkPayment } from "./settle.ts";
import { expirePayments, type PaymentIntentRow } from "./payment-intents.ts";
import { isPayerSignature, payerMessage } from "./payer.ts";

// Solo se lee tx_hash; cualquier otro campo (importe, destino…) se ignora (ADR-004, T5).
export const SubmitParams = z.object({
  tx_hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, "must be a 0x-prefixed 32-byte hex hash"),
});

export const PayerParams = z.strictObject({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "must be a 0x-prefixed 20-byte address"),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/, "must be a 0x-prefixed hex signature"),
});

type CheckoutRow = PaymentIntentRow & { merchant_name: string | null };

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
  await expirePayments({ clientSecretHash: hash }); // caducidad perezosa, igual que en la API del comercio
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

// Margen mínimo hasta la caducidad para empezar a pagar: firmar, enviar la transacción y mandar el hash
// lleva segundos, pero si el pago caducara entre medias el comprador pagaría sin que conste.
const MIN_TIME_TO_PAY_MS = 5 * 60_000;

// El comprador registra la cartera con la que va a pagar, firmando el mensaje del pago (T13). Se puede
// cambiar mientras no haya enviado la transacción (p. ej. si cambia de cartera).
export async function registerPayer(
  clientSecret: string,
  address: string,
  signature: string,
): Promise<CheckoutRow | "not_found" | "unexpected_state" | "payment_expiring" | "invalid_signature"> {
  const row = await findBySecret(clientSecret);
  if (!row) return "not_found";
  if (row.status !== "requires_payment") return "unexpected_state";
  if (row.expires_at.getTime() - Date.now() < MIN_TIME_TO_PAY_MS) return "payment_expiring";
  const valid = await isPayerSignature(row.livemode, address as `0x${string}`, payerMessage(row.id), signature as `0x${string}`);
  if (!valid) return "invalid_signature";
  const [updated] = await sql`
    UPDATE payment_intents SET payer_address = ${address.toLowerCase()}
    WHERE id = ${row.id} AND status = 'requires_payment' AND expires_at > now()
    RETURNING id`;
  if (!updated) return "unexpected_state";
  return (await findBySecret(clientSecret))!;
}

// El comprador envía el hash de su transacción. Solo se acepta en requires_payment, antes de caducar
// y con el pagador ya registrado (T13);
// UNIQUE(tx_hash) impide que una transacción pague dos pagos (ADR-004, T2).
export async function submitTransaction(
  clientSecret: string,
  txHash: string,
): Promise<CheckoutRow | "not_found" | "unexpected_state" | "payer_required" | "tx_already_used"> {
  try {
    const [updated] = await sql`
      UPDATE payment_intents SET status = 'processing', tx_hash = ${txHash.toLowerCase()}, submitted_at = now()
      WHERE client_secret_hash = ${sha256(clientSecret)} AND status = 'requires_payment' AND expires_at > now()
        AND payer_address IS NOT NULL
      RETURNING id`;
    if (!updated) {
      const row = await findBySecret(clientSecret);
      if (!row) return "not_found";
      return row.status === "requires_payment" && row.payer_address === null ? "payer_required" : "unexpected_state";
    }
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return "tx_already_used"; // viola UNIQUE(tx_hash)
    throw err;
  }
  return (await getCheckout(clientSecret))!; // comprueba la transacción en la cadena al momento
}
