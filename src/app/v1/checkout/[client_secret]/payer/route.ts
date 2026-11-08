// POST /v1/checkout/:client_secret/payer — el comprador registra la cartera con la que va a pagar (T13).
import { apiError, invalidJson, invalidParams, ok, readJson } from "../../../../../../lib/http.ts";
import { PayerParams, registerPayer, toSession } from "../../../../../../lib/checkout.ts";

export async function POST(request: Request, { params }: { params: Promise<{ client_secret: string }> }) {
  const { client_secret } = await params;

  const body = await readJson(request);
  if (body === undefined) return invalidJson();
  const parsed = PayerParams.safeParse(body);
  if (!parsed.success) return invalidParams(parsed.error);

  const result = await registerPayer(client_secret, parsed.data.address, parsed.data.signature);
  if (result === "not_found") return apiError(404, "invalid_request_error", "resource_missing", "No such checkout session.");
  if (result === "unexpected_state") {
    return apiError(409, "invalid_request_error", "payment_intent_unexpected_state", "This payment no longer accepts a payer.");
  }
  if (result === "payment_expiring") {
    return apiError(409, "invalid_request_error", "payment_expiring", "This payment expires in less than 5 minutes. Ask the merchant for a new one.");
  }
  if (result === "invalid_signature") {
    return apiError(400, "invalid_request_error", "invalid_signature", "The signature does not match the address.", "signature");
  }
  return ok(toSession(result));
}
