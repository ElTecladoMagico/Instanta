// Aplica en orden las migraciones de db/migrations que falten, cada una en su transacción (ADR-002).
// Uso: node scripts/migrate.ts   (Node 24 ejecuta TypeScript sin compilar)
import { readdir, readFile } from "node:fs/promises";
import { sql } from "../lib/db.ts";

const dir = new URL("../db/migrations/", import.meta.url);

await sql`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version    text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`;

const applied = new Set((await sql<{ version: string }[]>`SELECT version FROM schema_migrations`).map((r) => r.version));
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  if (applied.has(file)) continue;
  const text = await readFile(new URL(file, dir), "utf8");
  await sql.begin(async (tx) => {
    await tx.unsafe(text);
    await tx`INSERT INTO schema_migrations (version) VALUES (${file})`;
  });
  console.log(`migración aplicada: ${file}`);
}

await sql.end();
