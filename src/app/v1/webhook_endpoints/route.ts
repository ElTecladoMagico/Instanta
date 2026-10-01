// POST /v1/webhook_endpoints (registrar) y GET /v1/webhook_endpoints (listar).
import { authenticate } from "../../../../lib/api-keys.ts";
import { apiError, invalidJson, invalidParams, ok, readJson, unauthorized } from "../../../../lib/http.ts";
import { CreateEndpointParams, createEndpoint, endpointToApi, listEndpoints } from "../../../../lib/webhook-endpoints.ts";

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();

  const body = await readJson(request);
  if (body === undefined) return invalidJson();
  const params = CreateEndpointParams.safeParse(body);
  if (!params.success) return invalidParams(params.error);

  const result = await createEndpoint(auth, params.data.url);
  if (result === "not_https") return apiError(400, "invalid_request_error", "parameter_invalid", "Live mode requires an https URL.", "url");
  if (result === "not_public") {
    return apiError(400, "invalid_request_error", "url_not_public", "The URL must point to a public internet address.", "url");
  }
  if (result === "already_exists") {
    return apiError(409, "invalid_request_error", "webhook_endpoint_exists", "Delete the current webhook endpoint before adding another one.");
  }
  return ok({ ...endpointToApi(result.row), secret: result.secret }, 201);
}

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();
  const rows = await listEndpoints(auth);
  return ok({ object: "list", data: rows.map(endpointToApi), has_more: false });
}
