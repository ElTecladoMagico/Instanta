import { test } from "node:test";
import assert from "node:assert/strict";
import { newId } from "../lib/ids.ts";

test("newId: prefijo + guion bajo + 32 caracteres hexadecimales (128 bits)", () => {
  assert.match(newId("pi"), /^pi_[0-9a-f]{32}$/);
  assert.match(newId("req"), /^req_[0-9a-f]{32}$/);
});

test("newId: no repite ids (10 000 generados, ninguno duplicado)", () => {
  const ids = new Set(Array.from({ length: 10_000 }, () => newId("pi")));
  assert.equal(ids.size, 10_000);
});
