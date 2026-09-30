// POST /v1/payment_intents (crear) y GET /v1/payment_intents (listar). Ver docs/api/openapi.yaml.
import { authenticate } from "../../../../lib/api-keys.ts";
import { apiError, invalidJson, invalidParams, ok, readJson, unauthorized } from "../../../../lib/http.ts";
import { CreateParams, ListParams, createPaymentIntent, listPaymentIntents, toApi } from "../../../../lib/payment-intents.ts";

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();

  const body = await readJson(request);
  if (body === undefined) return invalidJson();
  const params = CreateParams.safeParse(body);
  if (!params.success) return invalidParams(params.error);

  const created = await createPaymentIntent(auth, params.data);
  if (!created) {
    return apiError(422, "invalid_request_error", "payout_address_missing", "Set a payout wallet before creating payments.");
  }
  return ok(toApi(created.row, created.clientSecret), 201);
}

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();

  const params = ListParams.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!params.success) return invalidParams(params.error);

  const { rows, hasMore } = await listPaymentIntents(auth, params.data);
  return ok({ object: "list", data: rows.map((row) => toApi(row)), has_more: hasMore });
}
