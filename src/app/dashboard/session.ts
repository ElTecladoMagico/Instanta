import "server-only";
// El comercio del dashboard sale SIEMPRE de la sesión de Clerk, en el servidor (ADR-006).
// Nunca de la URL ni de un formulario: así un comercio no puede actuar en nombre de otro (ADR-004, T6).
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureMerchant } from "../../../lib/merchants.ts";

export async function getMerchant() {
  const user = await currentUser();
  if (!user) redirect("/");
  return ensureMerchant(user.id, user.primaryEmailAddress?.emailAddress ?? "");
}

// Por ahora el dashboard trabaja en modo test (Base Sepolia); el modo live queda para después (ADR-012).
export const LIVEMODE = false;
export const authFor = (merchant: { id: string }) => ({ merchantId: merchant.id, livemode: LIVEMODE });
