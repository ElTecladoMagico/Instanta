// Endpoints de webhooks (ADR-009): la URL donde el comercio recibe los avisos y el secreto con que se firman.
// Uno por comercio y modo (UNIQUE en la BD).
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { sql } from "./db.ts";
import { newId } from "./ids.ts";
import { isPublicUrl } from "./ssrf.ts";
import type { Auth } from "./api-keys.ts";

export const CreateEndpointParams = z.strictObject({
  url: z.url({ protocol: /^https?$/ }).max(2048),
});

type EndpointRow = { id: string; livemode: boolean; url: string; enabled: boolean; created_at: Date };

export const endpointToApi = (row: EndpointRow) => ({
  id: row.id,
  object: "webhook_endpoint",
  livemode: row.livemode,
  url: row.url,
  enabled: row.enabled,
  created: Math.floor(row.created_at.getTime() / 1000),
});

// El secreto se guarda en claro, a diferencia de las API keys: hace falta para firmar cada aviso
// (una API key solo hay que comprobarla; el secreto hay que usarlo). Se muestra al comercio una sola vez.
export async function createEndpoint(
  auth: Auth,
  url: string,
): Promise<{ row: EndpointRow; secret: string } | "not_https" | "not_public" | "already_exists"> {
  if (auth.livemode && new URL(url).protocol !== "https:") return "not_https";
  if (!(await isPublicUrl(url))) return "not_public"; // protección SSRF
  const secret = `whsec_${randomBytes(32).toString("base64url")}`;
  try {
    const [row] = await sql<EndpointRow[]>`
      INSERT INTO webhook_endpoints (id, merchant_id, livemode, url, secret)
      VALUES (${newId("we")}, ${auth.merchantId}, ${auth.livemode}, ${url}, ${secret})
      RETURNING *`;
    return { row, secret };
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return "already_exists"; // UNIQUE (merchant_id, livemode)
    throw err;
  }
}

export function listEndpoints(auth: Auth) {
  return sql<EndpointRow[]>`
    SELECT * FROM webhook_endpoints
    WHERE merchant_id = ${auth.merchantId} AND livemode = ${auth.livemode}
    ORDER BY created_at`;
}

export async function deleteEndpoint(auth: Auth, id: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM webhook_endpoints
    WHERE id = ${id} AND merchant_id = ${auth.merchantId} AND livemode = ${auth.livemode}
    RETURNING id`;
  return rows.length > 0;
}
