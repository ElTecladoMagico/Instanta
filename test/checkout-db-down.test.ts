// Con la base de datos caída, enviar una transacción falla con el error real:
// no se confunde con "tx_already_used". Proceso propio: DATABASE_URL apunta a un puerto cerrado.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL = "postgres://nadie:nada@127.0.0.1:1/ninguna";
const { submitTransaction } = await import("../lib/checkout.ts");

test("un error de la base de datos se propaga, no se disfraza de tx_already_used", async () => {
  await assert.rejects(submitTransaction("pi_x_secret_y", "0x" + "a".repeat(64)), /ECONNREFUSED/);
});
