// POST /v1/payment_intents/:id/cancel (cancelar un pago que aún no se ha pagado).
import { authenticate } from "../../../../../../lib/api-keys.ts";
import { apiError, notFound, ok, unauthorized } from "../../../../../../lib/http.ts";
import { cancelPaymentIntent, toApi } from "../../../../../../lib/payment-intents.ts";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();

  const { id } = await params;
  const result = await cancelPaymentIntent(auth, id);
  if (result === "not_found") return notFound("payment_intent", id);
  if (result === "unexpected_state") {
    return apiError(409, "invalid_request_error", "payment_intent_unexpected_state", "Only payments in requires_payment can be canceled.");
  }
  return ok(toApi(result));
}
