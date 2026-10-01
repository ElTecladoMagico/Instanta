// GET /v1/events — historial de avisos del comercio.
import { authenticate } from "../../../../lib/api-keys.ts";
import { invalidParams, ok, unauthorized } from "../../../../lib/http.ts";
import { EventListParams, eventToApi, listEvents } from "../../../../lib/events.ts";

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();

  const params = EventListParams.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!params.success) return invalidParams(params.error);

  const { rows, hasMore } = await listEvents(auth, params.data);
  return ok({ object: "list", data: rows.map(eventToApi), has_more: hasMore });
}
