// GET /v1/health con la base de datos disponible. Necesita DATABASE_URL.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { GET } from "../src/app/v1/health/route.ts";
import { sql } from "../lib/db.ts";

after(() => sql.end());

test("health: 200, cuerpo ok y cabecera Request-Id req_…", async () => {
  const res = await GET();
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok", database: "ok" });
  assert.match(res.headers.get("Request-Id") ?? "", /^req_[0-9a-f]{32}$/);
});
