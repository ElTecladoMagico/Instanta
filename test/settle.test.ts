// checkPayment(): pide al nodo la transacción, llama a verify() y guarda el resultado (ADR-007, ADR-008).
// Usa un nodo falso con transacciones reales y la base de datos real. Necesita la BD migrada.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { numeric, sql } from "../lib/db.ts";
import { newId } from "../lib/ids.ts";
import { checkPayment } from "../lib/settle.ts";
import type { Row } from "../lib/payment-intents.ts";
import { loadFixture, randomTxHash, startFakeNode, type Fixture } from "./helpers/fake-node.ts";

const usdc = loadFixture("usdc-transfer"); // 1000 unidades de USDC a 0xb733…2810
const reverted = loadFixture("reverted");
const ethDirect = loadFixture("eth-transfer"); // 1e13 wei directos a 0xac50…1d0b
const eth7702 = loadFixture("eth-7702"); // 1e14 wei en una llamada interna a 0xae76…b17b (ADR-015)
const ME = "0xAE76BEEdd8DD39878D22E1b7a8Ff96e5c5e8B17b";
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const RECIPIENT = "0xb733d15fc0e90f0642fd369796c8025f18742810";

let node: Awaited<ReturnType<typeof startFakeNode>>;
before(async () => {
  node = await startFakeNode();
  process.env.BASE_SEPOLIA_RPC_URL = node.url;
  process.env.BASE_SEPOLIA_BLOCKSCOUT_URL = node.url;
});
after(async () => {
  node.close();
  await sql.end();
});

// Un pago en processing, creado justo antes de la transacción real del fixture.
async function processingIntent({ payTo = RECIPIENT, amount = 1000n, fixture = usdc as Fixture, currency = "usdc" } = {}) {
  const merchant = newId("mer");
  await sql`INSERT INTO merchants (id, clerk_user_id, email) VALUES (${merchant}, ${merchant}, 'settle@example.com')`;
  const txHash = randomTxHash();
  node.serve(txHash, fixture);
  const createdAt = new Date((Number(BigInt(fixture.block.timestamp)) - 60) * 1000);
  const [row] = await sql<Row[]>`
    INSERT INTO payment_intents (id, merchant_id, livemode, amount, currency, chain_id, token_address, pay_to,
                                 status, tx_hash, client_secret_hash, created_at, expires_at)
    VALUES (${newId("pi")}, ${merchant}, false, ${numeric(amount)}, ${currency}, 84532, ${currency === "usdc" ? USDC : null}, ${payTo},
            'processing', ${txHash}, ${newId("h")}, ${createdAt}, ${createdAt})
    RETURNING *`;
  return row;
}

test("pago correcto con confirmaciones suficientes → succeeded, con lo recibido y la fecha", async () => {
  node.setConfirmations(usdc, 5);
  const row = await checkPayment(await processingIntent());
  assert.equal(row.status, "succeeded");
  assert.equal(row.amount_received, 1000n);
  assert.ok(row.succeeded_at instanceof Date);
});

test("pago correcto con pocas confirmaciones → sigue en processing", async () => {
  node.setConfirmations(usdc, 1);
  const row = await checkPayment(await processingIntent());
  assert.equal(row.status, "processing");
});

test("pago a otra dirección → failed wrong_recipient y queda guardado", async () => {
  node.setConfirmations(usdc, 5);
  const intent = await processingIntent({ payTo: "0x1111111111111111111111111111111111111111" });
  await checkPayment(intent);
  const [stored] = await sql`SELECT status, failure_code FROM payment_intents WHERE id = ${intent.id}`;
  assert.deepEqual({ ...stored }, { status: "failed", failure_code: "wrong_recipient" });
});

test("pagar de menos → failed amount_mismatch, registrando lo recibido", async () => {
  node.setConfirmations(usdc, 5);
  const row = await checkPayment(await processingIntent({ amount: 5000n }));
  assert.equal(row.status, "failed");
  assert.equal(row.failure_code, "amount_mismatch");
  assert.equal(row.amount_received, 1000n);
});

test("transacción revertida → failed reverted", async () => {
  const row = await checkPayment(await processingIntent({ fixture: reverted }));
  assert.equal(row.failure_code, "reverted");
});

test("transacción que el nodo aún no conoce (no minada) → sigue en processing", async () => {
  const intent = await processingIntent();
  await sql`UPDATE payment_intents SET tx_hash = ${randomTxHash()} WHERE id = ${intent.id}`;
  const [row] = await sql<Row[]>`SELECT * FROM payment_intents WHERE id = ${intent.id}`;
  assert.equal((await checkPayment(row)).status, "processing");
});

test("si el nodo no responde → sigue en processing y no lanza error", async () => {
  const intent = await processingIntent();
  node.setDown(true);
  try {
    assert.equal((await checkPayment(intent)).status, "processing");
  } finally {
    node.setDown(false);
  }
});

test("un pago que no está en processing se devuelve tal cual, sin consultar al nodo", async () => {
  const intent = await processingIntent();
  node.setDown(true); // si consultara al nodo, fallaría
  try {
    const canceled = { ...intent, status: "canceled" };
    assert.equal(await checkPayment(canceled), canceled);
  } finally {
    node.setDown(false);
  }
});

test("si otro proceso ya cambió el pago, no se pisa: se devuelve el estado actual (ADR-007)", async () => {
  node.setConfirmations(usdc, 5);
  const stale = await processingIntent();
  // Mientras tanto, otro proceso (el worker, otra petición) lo marca como fallido.
  await sql`UPDATE payment_intents SET status = 'failed', failure_code = 'reverted' WHERE id = ${stale.id}`;
  const row = await checkPayment(stale);
  assert.equal(row.status, "failed");
  assert.equal(row.failure_code, "reverted");
});

test("los pagos de live se comprueban contra el nodo de Base (BASE_RPC_URL)", async () => {
  process.env.BASE_RPC_URL = node.url;
  node.setConfirmations(usdc, 20); // live exige 10
  const intent = await processingIntent();
  await sql`UPDATE payment_intents SET livemode = true, chain_id = 8453 WHERE id = ${intent.id}`;
  const row = await checkPayment({ ...intent, livemode: true, chain_id: 8453 });
  assert.equal(row.status, "succeeded");
});

// ── ETH desde cuentas inteligentes: transferencias internas vía Blockscout (ADR-015) ──

// Copia del fixture con el bloque minado "ahora" (para probar el margen de indexación de Blockscout).
const minedNow = (f: Fixture, internalTransfers = f.internalTransfers): Fixture => ({
  ...f,
  internalTransfers,
  block: { ...f.block, timestamp: "0x" + Math.floor(Date.now() / 1000).toString(16) },
});

test("pago en ETH desde una cuenta inteligente (EIP-7702) → succeeded gracias a Blockscout", async () => {
  node.setConfirmations(eth7702, 5);
  const row = await checkPayment(await processingIntent({ fixture: eth7702, currency: "eth", payTo: ME, amount: 100_000_000_000_000n }));
  assert.equal(row.status, "succeeded");
  assert.equal(row.amount_received, 100_000_000_000_000n);
});

test("si Blockscout no responde → sigue en processing", async () => {
  node.setConfirmations(eth7702, 5);
  const intent = await processingIntent({ fixture: eth7702, currency: "eth", payTo: ME, amount: 100_000_000_000_000n });
  node.setBlockscoutDown(true);
  try {
    assert.equal((await checkPayment(intent)).status, "processing");
  } finally {
    node.setBlockscoutDown(false);
  }
});

test("bloque reciente y Blockscout aún sin la transferencia interna → sigue en processing (margen de indexación)", async () => {
  const fixture = minedNow(eth7702, []);
  node.setConfirmations(fixture, 5);
  const row = await checkPayment(await processingIntent({ fixture, currency: "eth", payTo: ME, amount: 100_000_000_000_000n }));
  assert.equal(row.status, "processing");
});

test("pasado el margen de indexación sin transferencia al comercio → failed wrong_recipient", async () => {
  const fixture = { ...eth7702, internalTransfers: [] }; // bloque real, de hace más de 10 minutos
  node.setConfirmations(fixture, 5);
  const row = await checkPayment(await processingIntent({ fixture, currency: "eth", payTo: ME, amount: 100_000_000_000_000n }));
  assert.equal(row.failure_code, "wrong_recipient");
});

test("un pago directo en ETH no necesita Blockscout", async () => {
  node.setConfirmations(ethDirect, 5);
  node.setBlockscoutDown(true); // si lo consultara, quedaría en processing
  try {
    const row = await checkPayment(
      await processingIntent({ fixture: ethDirect, currency: "eth", payTo: "0xac50945444bdf9fef69b9a74819f093a4b491d0b", amount: 10_000_000_000_000n }),
    );
    assert.equal(row.status, "succeeded");
  } finally {
    node.setBlockscoutDown(false);
  }
});

test("si el nodo da el recibo pero aún no el bloque → sigue en processing y no lanza error", async () => {
  node.setConfirmations(usdc, 5);
  const intent = await processingIntent();
  node.hideBlock(usdc, true);
  try {
    assert.equal((await checkPayment(intent)).status, "processing");
  } finally {
    node.hideBlock(usdc, false);
  }
  assert.equal((await checkPayment(intent)).status, "succeeded"); // en cuanto el bloque aparece
});
