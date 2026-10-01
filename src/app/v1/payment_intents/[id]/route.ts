// GET /v1/payment_intents/:id (consultar un pago).
import { authenticate } from "../../../../../lib/api-keys.ts";
import { notFound, ok, unauthorized } from "../../../../../lib/http.ts";
import { getPaymentIntent, toApi } from "../../../../../lib/payment-intents.ts";
import { checkPayment } from "../../../../../lib/settle.ts";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();

  const { id } = await params;
  const row = await getPaymentIntent(auth, id);
  // Si está en processing, se aprovecha la consulta para comprobarlo en la cadena (ADR-008).
  return row ? ok(toApi(await checkPayment(row))) : notFound("payment_intent", id);
}
