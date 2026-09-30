// API keys para que el servidor del comercio use la API (ADR-006).
// La clave se muestra una sola vez; en la base de datos solo se guarda su SHA-256 (ADR-004, T7).
import { createHash, randomBytes } from "node:crypto";
import { sql } from "./db.ts";
import { newId } from "./ids.ts";

export type Auth = { merchantId: string; livemode: boolean };

// SHA-256 basta (no hace falta bcrypt): la clave es aleatoria de 256 bits, no una contraseña que adivinar.
const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

export function generateApiKey(livemode: boolean) {
  const key = `sk_${livemode ? "live" : "test"}_${randomBytes(32).toString("base64url")}`;
  return { key, hash: sha256(key), prefix: key.slice(0, 12) };
}

// Crea una clave para el comercio y la devuelve en claro. Es la única vez que se puede ver.
export async function createApiKey(merchantId: string, livemode: boolean): Promise<string> {
  const { key, hash, prefix } = generateApiKey(livemode);
  await sql`
    INSERT INTO api_keys (id, merchant_id, livemode, prefix, key_hash)
    VALUES (${newId("key")}, ${merchantId}, ${livemode}, ${prefix}, ${hash})`;
  return key;
}

// Lee "Authorization: Bearer sk_…" y devuelve el comercio y el modo, o null si la clave no vale.
// Se busca por el hash: el código nunca compara la clave en claro.
export async function authenticate(request: Request): Promise<Auth | null> {
  const match = request.headers.get("authorization")?.match(/^Bearer (sk_(?:test|live)_[A-Za-z0-9_-]+)$/);
  if (!match) return null;
  const [row] = await sql<{ merchant_id: string; livemode: boolean }[]>`
    SELECT merchant_id, livemode FROM api_keys
    WHERE key_hash = ${sha256(match[1])} AND revoked_at IS NULL`;
  return row ? { merchantId: row.merchant_id, livemode: row.livemode } : null;
}
