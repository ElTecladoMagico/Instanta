// La cuenta del comercio en el dashboard (ADR-006, ADR-012): alta con Clerk, nombre y cartera de cobro.
// Reciben el comercio de la sesión de Clerk; nunca un id que venga del navegador. Lo demás que gestiona
// desde el panel está en su módulo: api-keys.ts, payment-links.ts, webhook-endpoints.ts y events.ts.
import { isAddress } from "viem";
import { sql } from "./db.ts";
import { newId } from "./ids.ts";

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
