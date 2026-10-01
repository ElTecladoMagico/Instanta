// verify() sobre transacciones reales de Base Sepolia (test/fixtures). Reglas de ADR-008 y ADR-013.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verify, type ChainTx, type Intent } from "../lib/verify.ts";

const fixture = (name: string): ChainTx => JSON.parse(readFileSync(new URL(`fixtures/${name}.json`, import.meta.url), "utf8"));
const usdcTx = fixture("usdc-transfer");
const ethTx = fixture("eth-transfer");
const revertedTx = fixture("reverted");

const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const OTHER = "0x1111111111111111111111111111111111111111";
const ENOUGH = 3; // confirmaciones que tiene la transacción en estos tests
const REQUIRED = 2; // confirmaciones exigidas

// Datos reales de los fixtures:
// usdc-transfer: Transfer de 1000 unidades (0,001 USDC) a 0xb733…2810, bloque con timestamp 1790792084.
//                También emite AuthorizationUsed, que lleva otra dirección (0x9b16…e40f) en topics[2].
// eth-transfer:  1e13 wei (0,00001 ETH) a 0xac50…1d0b, bloque con timestamp 1790792852.
const usdcIntent: Intent = {
  currency: "usdc",
  amount: 1000n,
  payTo: "0xb733d15fc0e90f0642fd369796c8025f18742810",
  tokenAddress: USDC,
  createdAt: 1790792084 - 60,
};
const ethIntent: Intent = {
  currency: "eth",
  amount: 10_000_000_000_000n,
  payTo: "0xac50945444bdf9fef69b9a74819f093a4b491d0b",
  tokenAddress: null,
  createdAt: 1790792852 - 60,
};

// ── USDC ────────────────────────────────────────────────────────────────────

test("USDC: Transfer del contrato correcto al comercio por el importe exacto → succeeded", () => {
  assert.deepEqual(verify(usdcIntent, usdcTx, ENOUGH, REQUIRED), { status: "succeeded", amountReceived: 1000n });
});

test("USDC: si paga de más → succeeded y se registra lo recibido", () => {
  assert.deepEqual(verify({ ...usdcIntent, amount: 999n }, usdcTx, ENOUGH, REQUIRED), { status: "succeeded", amountReceived: 1000n });
});

test("USDC: si paga de menos → failed amount_mismatch", () => {
  assert.deepEqual(verify({ ...usdcIntent, amount: 1001n }, usdcTx, ENOUGH, REQUIRED), {
    status: "failed",
    code: "amount_mismatch",
    amountReceived: 1000n,
  });
});

test("USDC: pago a otra dirección → failed wrong_recipient", () => {
  assert.deepEqual(verify({ ...usdcIntent, payTo: OTHER }, usdcTx, ENOUGH, REQUIRED), {
    status: "failed",
    code: "wrong_recipient",
    amountReceived: 0n,
  });
});

test("USDC: solo cuenta el evento Transfer; la dirección de AuthorizationUsed no es un pago", () => {
  const payToFromOtherEvent = "0x9b1626b03da8343f481adb6c146beaf04985e40f";
  assert.equal(verify({ ...usdcIntent, payTo: payToFromOtherEvent }, usdcTx, ENOUGH, REQUIRED).status, "failed");
});

test("USDC: Transfer al comercio pero de otro contrato (token falso) → failed wrong_token", () => {
  assert.deepEqual(verify({ ...usdcIntent, tokenAddress: OTHER }, usdcTx, ENOUGH, REQUIRED), {
    status: "failed",
    code: "wrong_token",
    amountReceived: 0n,
  });
});

test("USDC: las direcciones se comparan sin distinguir mayúsculas (checksum EIP-55)", () => {
  const upper = { ...usdcIntent, payTo: "0xB733D15FC0E90F0642FD369796C8025F18742810", tokenAddress: USDC.toLowerCase() };
  assert.equal(verify(upper, usdcTx, ENOUGH, REQUIRED).status, "succeeded");
});

test("USDC: una transacción de ETH no paga un pago en USDC → failed wrong_recipient", () => {
  assert.equal(verify({ ...usdcIntent, payTo: ethIntent.payTo }, ethTx, ENOUGH, REQUIRED).status, "failed");
});

// ── ETH ─────────────────────────────────────────────────────────────────────

test("ETH: transferencia directa al comercio por el importe exacto → succeeded", () => {
  assert.deepEqual(verify(ethIntent, ethTx, ENOUGH, REQUIRED), { status: "succeeded", amountReceived: 10_000_000_000_000n });
});

test("ETH: si paga de menos → failed amount_mismatch", () => {
  assert.deepEqual(verify({ ...ethIntent, amount: 10_000_000_000_001n }, ethTx, ENOUGH, REQUIRED), {
    status: "failed",
    code: "amount_mismatch",
    amountReceived: 10_000_000_000_000n,
  });
});

test("ETH: transacción a otra dirección → failed wrong_recipient", () => {
  assert.deepEqual(verify({ ...ethIntent, payTo: OTHER }, ethTx, ENOUGH, REQUIRED), {
    status: "failed",
    code: "wrong_recipient",
    amountReceived: 0n,
  });
});

test("ETH: una llamada al contrato de USDC (value 0) no paga un pago en ETH → failed", () => {
  assert.equal(verify({ ...ethIntent, payTo: USDC }, usdcTx, ENOUGH, REQUIRED).status, "failed");
});

// ── Reglas comunes ──────────────────────────────────────────────────────────

test("transacción revertida → failed reverted", () => {
  assert.deepEqual(verify(ethIntent, revertedTx, ENOUGH, REQUIRED), { status: "failed", code: "reverted", amountReceived: 0n });
});

test("transacción anterior a la creación del pago → failed tx_too_old (ADR-004, T4)", () => {
  assert.deepEqual(verify({ ...usdcIntent, createdAt: 1790792084 + 1 }, usdcTx, ENOUGH, REQUIRED), {
    status: "failed",
    code: "tx_too_old",
    amountReceived: 1000n,
  });
});

test("pago correcto con menos confirmaciones de las exigidas → processing", () => {
  assert.deepEqual(verify(usdcIntent, usdcTx, 1, REQUIRED), { status: "processing" });
});

test("con justo las confirmaciones exigidas → succeeded", () => {
  assert.equal(verify(usdcIntent, usdcTx, REQUIRED, REQUIRED).status, "succeeded");
});

// ── ETH desde cuentas inteligentes (EIP-7702, ADR-015) ──────────────────────
// eth-7702: pago real de la prueba E2E. MetaMask lo envió como transacción tipo 0x4 desde un relayer,
// dirigida a un contrato y con value 0; los 0,0001 ETH se movieron en una llamada interna a 0xae76…b17b.
const eth7702Tx = fixture("eth-7702");
const eth7702Intent: Intent = {
  currency: "eth",
  amount: 100_000_000_000_000n,
  payTo: "0xAE76BEEdd8DD39878D22E1b7a8Ff96e5c5e8B17b",
  tokenAddress: null,
  createdAt: 1790849960 - 60,
};

test("ETH desde una cuenta inteligente: cuenta la transferencia interna al comercio → succeeded", () => {
  assert.deepEqual(verify(eth7702Intent, eth7702Tx, ENOUGH, REQUIRED), { status: "succeeded", amountReceived: 100_000_000_000_000n });
});

test("ETH desde una cuenta inteligente a otra dirección → failed wrong_recipient", () => {
  assert.deepEqual(verify({ ...eth7702Intent, payTo: OTHER }, eth7702Tx, ENOUGH, REQUIRED), {
    status: "failed",
    code: "wrong_recipient",
    amountReceived: 0n,
  });
});

test("ETH desde una cuenta inteligente pagando de menos → failed amount_mismatch", () => {
  assert.deepEqual(verify({ ...eth7702Intent, amount: 100_000_000_000_001n }, eth7702Tx, ENOUGH, REQUIRED), {
    status: "failed",
    code: "amount_mismatch",
    amountReceived: 100_000_000_000_000n,
  });
});

test("sin transferencias internas (Blockscout no consultado) se comporta como antes → wrong_recipient", () => {
  assert.equal(verify(eth7702Intent, { ...eth7702Tx, internalTransfers: undefined }, ENOUGH, REQUIRED).status, "failed");
});

test("una llamada interna que falló o que es delegatecall no cuenta como pago", () => {
  const modified = (change: object) => ({
    ...eth7702Tx,
    internalTransfers: eth7702Tx.internalTransfers!.map((t) => (t.value === "100000000000000" ? { ...t, ...change } : t)),
  });
  assert.equal(verify(eth7702Intent, modified({ success: false }), ENOUGH, REQUIRED).status, "failed");
  assert.equal(verify(eth7702Intent, modified({ type: "delegatecall" }), ENOUGH, REQUIRED).status, "failed");
});
