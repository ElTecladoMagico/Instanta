// Payment links (ADR-010): plantillas de pago para el botón embebible.
// Al hacer clic en el botón se crea un pago normal (payment_intent) a partir del enlace.
import { numeric, sql } from "./db.ts";
import { newId } from "./ids.ts";
import { createPaymentIntent, toApi } from "./payment-intents.ts";
import type { Auth } from "./api-keys.ts";

type Currency = "usdc" | "eth";

export async function createPaymentLink(auth: Auth, link: { title: string; amount: bigint; currency: Currency }): Promise<string> {
  const id = newId("pl");
  await sql`
    INSERT INTO payment_links (id, merchant_id, livemode, title, amount, currency)
    VALUES (${id}, ${auth.merchantId}, ${auth.livemode}, ${link.title}, ${numeric(link.amount)}, ${link.currency})`;
  return id;
}

// Crea un pago desde un enlace activo. Importe, moneda y destino salen del enlace y del comercio,
// nunca de la petición, que es pública (ADR-004, T5).
export async function checkoutFromLink(linkId: string): Promise<{ checkoutUrl: string } | "not_found" | "payout_address_missing"> {
  const [link] = await sql<{ merchant_id: string; livemode: boolean; title: string; amount: bigint; currency: Currency }[]>`
    SELECT merchant_id, livemode, title, amount, currency FROM payment_links WHERE id = ${linkId} AND active`;
  if (!link) return "not_found";

  const created = await createPaymentIntent(
    { merchantId: link.merchant_id, livemode: link.livemode },
    { amount: link.amount.toString(), currency: link.currency, description: link.title },
    linkId,
  );
  if (!created) return "payout_address_missing";
  return { checkoutUrl: toApi(created.row, created.clientSecret).checkout_url! };
}
