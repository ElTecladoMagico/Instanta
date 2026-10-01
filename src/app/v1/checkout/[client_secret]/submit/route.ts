// POST /v1/checkout/:client_secret/submit — el comprador envía el hash de su transacción.
import { apiError, invalidJson, invalidParams, ok, readJson } from "../../../../../../lib/http.ts";
import { SubmitParams, submitTransaction, toSession } from "../../../../../../lib/checkout.ts";

export async function POST(request: Request, { params }: { params: Promise<{ client_secret: string }> }) {
  const { client_secret } = await params;

  const body = await readJson(request);
  if (body === undefined) return invalidJson();
  const parsed = SubmitParams.safeParse(body);
  if (!parsed.success) return invalidParams(parsed.error);

  const result = await submitTransaction(client_secret, parsed.data.tx_hash);
  if (result === "not_found") return apiError(404, "invalid_request_error", "resource_missing", "No such checkout session.");
  if (result === "unexpected_state") {
    return apiError(409, "invalid_request_error", "payment_intent_unexpected_state", "This payment no longer accepts a transaction.");
  }
  if (result === "tx_already_used") {
    return apiError(409, "invalid_request_error", "tx_already_used", "This transaction has already been used to pay another payment.", "tx_hash");
  }
  return ok(toSession(result));
}
