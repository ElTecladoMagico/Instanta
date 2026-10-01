// Lógica del dashboard (ADR-006, ADR-012): la cuenta del comercio y lo que gestiona desde el panel.
// Todas las funciones reciben el comercio de la sesión de Clerk; nunca un id que venga del navegador.
import { isAddress } from "viem";
import { sql } from "./db.ts";
import { newId } from "./ids.ts";
import type { Auth } from "./api-keys.ts";

export type Merchant = { id: string; email: string; name: string | null; payout_address: string | null };

// El comercio se crea la primera vez que entra con Clerk; las siguientes se devuelve el mismo.
export async function ensureMerchant(clerkUserId: string, email: string): Promise<Merchant> {
  const [merchant] = await sql<Merchant[]>`
    INSERT INTO merchants (id, clerk_user_id, email) VALUES (${newId("mer")}, ${clerkUserId}, ${email})
    ON CONFLICT (clerk_user_id) DO UPDATE SET email = EXCLUDED.email
    RETURNING id, email, name, payout_address`;
  return merchant;
}

// La cartera de cobro se valida con su checksum (EIP-55): una letra mal copiada haría perder los cobros.
export async function updateProfile(merchantId: string, profile: { name: string; payoutAddress: string }): Promise<"ok" | "invalid_address"> {
  if (!isAddress(profile.payoutAddress, { strict: true })) return "invalid_address";
  await sql`
    UPDATE merchants SET name = ${profile.name.trim().slice(0, 100) || null}, payout_address = ${profile.payoutAddress}
    WHERE id = ${merchantId}`;
  return "ok";
}

// ── API keys ──
export function listApiKeys(auth: Auth) {
  return sql<{ id: string; prefix: string; created_at: Date; revoked: boolean }[]>`
    SELECT id, prefix, created_at, revoked_at IS NOT NULL AS revoked FROM api_keys
    WHERE merchant_id = ${auth.merchantId} AND livemode = ${auth.livemode}
    ORDER BY created_at DESC`;
}

export async function revokeApiKey(merchantId: string, keyId: string): Promise<boolean> {
  const rows = await sql`
    UPDATE api_keys SET revoked_at = now()
    WHERE id = ${keyId} AND merchant_id = ${merchantId} AND revoked_at IS NULL
    RETURNING id`;
  return rows.length > 0;
}

// ── Payment links ──
export function listPaymentLinks(auth: Auth) {
  return sql<{ id: string; title: string; amount: bigint; currency: "usdc" | "eth"; active: boolean; created_at: Date }[]>`
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

// ── Avisos ──
// Vuelve a poner en cola un aviso que agotó sus reintentos (p. ej. tras arreglar el servidor del comercio).
export async function resendEvent(auth: Auth, eventId: string): Promise<boolean> {
  const rows = await sql`
    UPDATE events SET delivery_status = 'pending', attempts = 0, last_error = NULL, next_attempt_at = now()
    WHERE id = ${eventId} AND merchant_id = ${auth.merchantId} AND livemode = ${auth.livemode}
      AND delivery_status = 'failed'
    RETURNING id`;
  return rows.length > 0;
}
