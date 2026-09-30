import { sql } from "../../../../lib/db.ts";
import { apiError, ok } from "../../../../lib/http.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await sql`SELECT 1`;
    return ok({ status: "ok", database: "ok" });
  } catch {
    return apiError(503, "api_error", "service_unavailable", "Database unavailable.");
  }
}
