// GET /v1/payment_intents/:id (consultar un pago).
import { authenticate } from "../../../../../lib/api-keys.ts";
import { notFound, ok, unauthorized } from "../../../../../lib/http.ts";
import { getPaymentIntent, toApi } from "../../../../../lib/payment-intents.ts";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();

  const { id } = await params;
  const row = await getPaymentIntent(auth, id);
  return row ? ok(toApi(row)) : notFound("payment_intent", id);
}
