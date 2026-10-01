// Con la base de datos caída, registrar un endpoint falla con el error real:
// no se confunde con "ya existe". Proceso propio: DATABASE_URL apunta a un puerto cerrado.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL = "postgres://nadie:nada@127.0.0.1:1/ninguna";
const { createEndpoint } = await import("../lib/webhook-endpoints.ts");

test("un error de la base de datos se propaga, no se disfraza de webhook_endpoint_exists", async () => {
  await assert.rejects(createEndpoint({ merchantId: "mer_x", livemode: false }, "https://1.1.1.1/hook"), /ECONNREFUSED/);
});
