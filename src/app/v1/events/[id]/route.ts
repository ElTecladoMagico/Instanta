// GET /v1/events/:id
import { authenticate } from "../../../../../lib/api-keys.ts";
import { notFound, ok, unauthorized } from "../../../../../lib/http.ts";
import { eventToApi, getEvent } from "../../../../../lib/events.ts";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();
  const { id } = await params;
  const row = await getEvent(auth, id);
  return row ? ok(eventToApi(row)) : notFound("event", id);
}
