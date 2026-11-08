// Reglas de la arquitectura interna (ADR-017), comprobadas leyendo el código fuente.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("el núcleo puro (verify.ts y money.ts) no importa la BD, el nodo ni Blockscout, ni usa fetch", () => {
  for (const file of ["lib/verify.ts", "lib/money.ts"]) {
    const source = read(file);
    assert.doesNotMatch(source, /from "\.\/(db|rpc|blockscout)\.ts"/, file);
    assert.doesNotMatch(source, /\bfetch\(/, file);
  }
});

// Las migraciones (db/) y los tests preparan datos con SQL propio: no cuentan.
test("solo lib/payment-intents.ts escribe en payment_intents (una función por transición, ADR-007)", () => {
  const files = ["lib", "src", "worker", "scripts"].flatMap((dir) =>
    readdirSync(new URL(`../${dir}`, import.meta.url), { recursive: true, encoding: "utf8" })
      .filter((name) => /\.tsx?$/.test(name))
      .map((name) => `${dir}/${name}`),
  );
  const writers = files.filter((file) => read(file).includes("UPDATE payment_intents"));
  assert.deepEqual(writers, ["lib/payment-intents.ts"]);
});
