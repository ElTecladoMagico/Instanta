// GET /v1/health con la base de datos caída. node --test ejecuta cada archivo en su propio proceso,
// así que aquí se puede apuntar DATABASE_URL a un puerto cerrado antes de cargar la ruta.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL = "postgres://nadie:nada@127.0.0.1:1/ninguna";
const { GET } = await import("../src/app/v1/health/route.ts");

test("health sin base de datos: 503 con error de la API y Request-Id", async () => {
  const res = await GET();
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.error.type, "api_error");
  assert.equal(body.error.code, "service_unavailable");
  assert.match(res.headers.get("Request-Id") ?? "", /^req_[0-9a-f]{32}$/);
});
