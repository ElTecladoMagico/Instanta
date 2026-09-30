import { sql } from "../../../../lib/db.ts";
import { newId } from "../../../../lib/ids.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Request-Id": newId("req") };
  try {
    await sql`SELECT 1`;
    return Response.json({ status: "ok", database: "ok" }, { headers });
  } catch {
    return Response.json(
      { error: { type: "api_error", code: "service_unavailable", message: "Database unavailable." } },
      { status: 503, headers },
    );
  }
}
