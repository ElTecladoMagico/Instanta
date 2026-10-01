// Una vuelta del worker (runOnce): caduca pagos, los comprueba en la cadena y envía los avisos.
// De punta a punta: nodo falso con una transacción real + servidor falso del comercio. Necesita la BD migrada.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { numeric, sql } from "../lib/db.ts";
import { newId } from "../lib/ids.ts";
import { runOnce } from "../lib/worker.ts";
import { verifySignature } from "../lib/webhooks.ts";
import { loadFixture, randomTxHash, startFakeNode } from "./helpers/fake-node.ts";

process.env.WEBHOOK_ALLOW_PRIVATE_HOSTS = "1"; // el servidor del comercio de los tests está en 127.0.0.1

const usdc = loadFixture("usdc-transfer"); // 1000 unidades de USDC a 0xb733…2810
const RECIPIENT = "0xb733d15fc0e90f0642fd369796c8025f18742810";
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

let node: Awaited<ReturnType<typeof startFakeNode>>;
let shop: Server;
let shopUrl = "";
let received: { signature: string; body: string }[] = [];

before(async () => {
  node = await startFakeNode();
  process.env.BASE_SEPOLIA_RPC_URL = node.url;
  shop = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      received.push({ signature: String(req.headers["instanta-signature"]), body });
      res.writeHead(200).end();
    });
  });
  await new Promise<void>((resolve) => shop.listen(0, "127.0.0.1", resolve));
  shopUrl = `http://127.0.0.1:${(shop.address() as { port: number }).port}/webhook`;
});
after(async () => {
  node.close();
  shop.close();
  await sql.end();
});
beforeEach(async () => {
  received = [];
  // El worker actúa sobre toda la BD: se retiran los avisos pendientes que hayan dejado otros tests.
  await sql`UPDATE events SET delivery_status = 'failed' WHERE delivery_status = 'pending'`;
});

async function merchantWithEndpoint() {
  const merchantId = newId("mer");
  const secret = "whsec_worker_" + merchantId;
  await sql`INSERT INTO merchants (id, clerk_user_id, email, payout_address) VALUES (${merchantId}, ${merchantId}, 'worker@example.com', ${RECIPIENT})`;
  await sql`INSERT INTO webhook_endpoints (id, merchant_id, livemode, url, secret) VALUES (${newId("we")}, ${merchantId}, false, ${shopUrl}, ${secret})`;
  return { merchantId, secret };
}

async function insertIntent(merchantId: string, fields: { status: string; txHash?: string; createdAt: Date; expiresAt: Date }) {
  const id = newId("pi");
  await sql`
    INSERT INTO payment_intents (id, merchant_id, livemode, amount, currency, chain_id, token_address, pay_to,
                                 status, tx_hash, client_secret_hash, created_at, expires_at)
    VALUES (${id}, ${merchantId}, false, ${numeric(1000n)}, 'usdc', 84532, ${USDC}, ${RECIPIENT},
            ${fields.status}, ${fields.txHash ?? null}, ${newId("h")}, ${fields.createdAt}, ${fields.expiresAt})`;
  return id;
}
const statusOf = async (id: string) => (await sql`SELECT status FROM payment_intents WHERE id = ${id}`)[0].status;
const webhooksFor = (id: string) => received.filter((r) => r.body.includes(id)).map((r) => ({ ...r, event: JSON.parse(r.body) }));

test("pago en processing → el worker lo verifica y el comercio recibe el aviso firmado", async () => {
  const { merchantId, secret } = await merchantWithEndpoint();
  const txHash = randomTxHash();
  node.serve(txHash, usdc);
  node.setConfirmations(usdc, 5);
  const createdAt = new Date((Number(BigInt(usdc.block.timestamp)) - 60) * 1000);
  const id = await insertIntent(merchantId, { status: "processing", txHash, createdAt, expiresAt: createdAt });

  await runOnce();

  assert.equal(await statusOf(id), "succeeded");
  const [webhook] = webhooksFor(id);
  assert.equal(webhook.event.type, "payment_intent.succeeded");
  assert.equal(webhook.event.data.object.status, "succeeded");
  assert.equal(verifySignature(secret, webhook.signature, webhook.body), true);
});

test("pago sin pagar vencido → el worker lo caduca y avisa al comercio", async () => {
  const { merchantId } = await merchantWithEndpoint();
  const id = await insertIntent(merchantId, { status: "requires_payment", createdAt: new Date(Date.now() - 7_200_000), expiresAt: new Date(Date.now() - 1000) });

  await runOnce();

  assert.equal(await statusOf(id), "expired");
  assert.deepEqual(webhooksFor(id).map((w) => w.event.type), ["payment_intent.expired"]);
});

test("con el nodo caído, el worker no se detiene: los pagos esperan y los avisos se siguen enviando", async () => {
  const { merchantId } = await merchantWithEndpoint();
  const txHash = randomTxHash();
  node.serve(txHash, usdc);
  const createdAt = new Date((Number(BigInt(usdc.block.timestamp)) - 60) * 1000);
  const pending = await insertIntent(merchantId, { status: "processing", txHash, createdAt, expiresAt: createdAt });
  const expiring = await insertIntent(merchantId, { status: "requires_payment", createdAt: new Date(Date.now() - 7_200_000), expiresAt: new Date(Date.now() - 1000) });
  node.setDown(true);
  try {
    await runOnce();
  } finally {
    node.setDown(false);
  }
  assert.equal(await statusOf(pending), "processing");
  assert.equal(webhooksFor(expiring).length, 1);
});
