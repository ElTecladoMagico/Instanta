// GET /v1/checkout/:client_secret — datos para la página de pago (pública, sin API key).
import { apiError, ok } from "../../../../../lib/http.ts";
import { getCheckout, toSession } from "../../../../../lib/checkout.ts";

export async function GET(_request: Request, { params }: { params: Promise<{ client_secret: string }> }) {
  const { client_secret } = await params;
  const row = await getCheckout(client_secret);
  // El mensaje no repite el client_secret: es un secreto y no debe acabar en logs (ADR-010).
  return row ? ok(toSession(row)) : apiError(404, "invalid_request_error", "resource_missing", "No such checkout session.");
}
