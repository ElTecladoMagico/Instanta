// Payment links (ADR-010): plantillas de pago para el botón embebible.
// Al hacer clic en el botón se crea un pago normal (payment_intent) a partir del enlace.
import { numeric, sql } from "./db.ts";
import { newId } from "./ids.ts";
import { createPaymentIntent, toApi } from "./payment-intents.ts";
import type { Auth } from "./api-keys.ts";
import type { Currency } from "./money.ts";

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

// Para el dashboard: los enlaces del comercio y activarlos o desactivarlos.
export function listPaymentLinks(auth: Auth) {
  return sql<{ id: string; title: string; amount: bigint; currency: Currency; active: boolean; created_at: Date }[]>`
    SELECT id, title, amount, currency, active, created_at FROM payment_links
    WHERE merchant_id = ${auth.merchantId} AND livemode = ${auth.livemode}
    ORDER BY created_at DESC`;
}

export async function setPaymentLinkActive(auth: Auth, linkId: string, active: boolean): Promise<boolean> {
  const rows = await sql`
    UPDATE payment_links SET active = ${active}
    WHERE id = ${linkId} AND merchant_id = ${auth.merchantId} AND livemode = ${auth.livemode}
    RETURNING id`;
  return rows.length > 0;
}
