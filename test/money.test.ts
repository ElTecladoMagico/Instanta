// Cómo se muestran los importes en la página de pago y en el dashboard.
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatAmount } from "../lib/money.ts";

test("USDC (6 decimales): unidades mínimas → texto legible", () => {
  assert.equal(formatAmount("10000000", "usdc"), "10 USDC");
  assert.equal(formatAmount("1500000", "usdc"), "1.5 USDC");
  assert.equal(formatAmount("1000", "usdc"), "0.001 USDC");
});

test("ETH (18 decimales): wei → texto legible, también por encima de 2^63", () => {
  assert.equal(formatAmount("1000000000000000", "eth"), "0.001 ETH");
  assert.equal(formatAmount("1000000000000000000000000", "eth"), "1000000 ETH");
});
