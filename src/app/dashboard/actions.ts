"use server";
// Server Actions del dashboard: los formularios llaman a estas funciones, que se ejecutan en el servidor.
// Cada una obtiene el comercio de la sesión y llama a lib/, que es donde está la lógica (y sus tests).
import { revalidatePath } from "next/cache";
import { parseUnits } from "viem";
import { createApiKey } from "../../../lib/api-keys.ts";
import { createPaymentLink } from "../../../lib/payment-links.ts";
import { createEndpoint, deleteEndpoint } from "../../../lib/webhook-endpoints.ts";
import { resendEvent, revokeApiKey, setPaymentLinkActive, updateProfile } from "../../../lib/merchants.ts";
import { authFor, getMerchant, LIVEMODE } from "./session.ts";

export type FormState = { error?: string; secret?: string; done?: boolean } | null;

export async function saveProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const merchant = await getMerchant();
  const result = await updateProfile(merchant.id, {
    name: String(form.get("name") ?? ""),
    payoutAddress: String(form.get("payout_address") ?? "").trim(),
  });
  if (result === "invalid_address") return { error: "That is not a valid address. Copy it again from your wallet (the checksum does not match)." };
  revalidatePath("/dashboard", "layout");
  return { done: true };
}

export async function newApiKey(): Promise<FormState> {
  const merchant = await getMerchant();
  const secret = await createApiKey(merchant.id, LIVEMODE);
  revalidatePath("/dashboard/developers");
  return { secret };
}

export async function revokeKey(form: FormData) {
  const merchant = await getMerchant();
  await revokeApiKey(merchant.id, String(form.get("id")));
  revalidatePath("/dashboard/developers");
}

export async function newWebhookEndpoint(_prev: FormState, form: FormData): Promise<FormState> {
  const merchant = await getMerchant();
  const url = String(form.get("url") ?? "").trim();
  if (!URL.canParse(url) || !/^https?:$/.test(new URL(url).protocol)) return { error: "Enter an http(s) URL." };
  const result = await createEndpoint(authFor(merchant), url);
  if (result === "not_public") return { error: "The URL must point to a public internet address." };
  if (result === "not_https") return { error: "Live mode requires an https URL." };
  if (result === "already_exists") return { error: "Delete the current endpoint first." };
  revalidatePath("/dashboard/developers");
  return { secret: result.secret };
}

export async function removeWebhookEndpoint(form: FormData) {
  const merchant = await getMerchant();
  await deleteEndpoint(authFor(merchant), String(form.get("id")));
  revalidatePath("/dashboard/developers");
}

export async function resend(form: FormData) {
  const merchant = await getMerchant();
  await resendEvent(authFor(merchant), String(form.get("id")));
  revalidatePath("/dashboard/developers");
}

// El comercio escribe el importe en unidades normales ("10.5"); se guarda en unidades mínimas (ADR-007).
export async function newPaymentLink(_prev: FormState, form: FormData): Promise<FormState> {
  const merchant = await getMerchant();
  const title = String(form.get("title") ?? "").trim();
  const currency = form.get("currency") === "eth" ? "eth" : "usdc";
  let amount: bigint;
  try {
    amount = parseUnits(String(form.get("amount") ?? ""), currency === "eth" ? 18 : 6);
  } catch {
    return { error: "Enter an amount such as 10 or 0.5." };
  }
  if (!title || amount <= 0n) return { error: "Enter a title and an amount greater than zero." };
  await createPaymentLink(authFor(merchant), { title: title.slice(0, 100), amount, currency });
  revalidatePath("/dashboard/links");
  return { done: true };
}

export async function toggleLink(form: FormData) {
  const merchant = await getMerchant();
  await setPaymentLinkActive(authFor(merchant), String(form.get("id")), form.get("active") === "true");
  revalidatePath("/dashboard/links");
}
