// DELETE /v1/webhook_endpoints/:id
import { authenticate } from "../../../../../lib/api-keys.ts";
import { notFound, ok, unauthorized } from "../../../../../lib/http.ts";
import { deleteEndpoint } from "../../../../../lib/webhook-endpoints.ts";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (!auth) return unauthorized();
  const { id } = await params;
  return (await deleteEndpoint(auth, id)) ? ok({ id, object: "webhook_endpoint", deleted: true }) : notFound("webhook_endpoint", id);
}
