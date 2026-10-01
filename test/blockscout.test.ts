// internalTransfers() contra un Blockscout falso: un servidor HTTP local que responde como su API v2.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { internalTransfers } from "../lib/blockscout.ts";

let server: Server;
let url = "";
const requested: string[] = [];

// Dos páginas, con los campos que devuelve la API real de Blockscout.
const page1 = {
  items: [
    { type: "staticcall", to: { hash: "0xAE76BEEdd8DD39878D22E1b7a8Ff96e5c5e8B17b" }, value: "0", success: true },
    { type: "call", to: { hash: "0xAE76BEEdd8DD39878D22E1b7a8Ff96e5c5e8B17b" }, value: "100000000000000", success: true },
  ],
  next_page_params: { index: 2, items_count: 2 },
};
const page2 = {
  items: [{ type: "call", to: null, value: "5", success: false }],
  next_page_params: null,
};

before(async () => {
  server = createServer((req, res) => {
    requested.push(req.url!);
    if (req.url!.includes("0xdead")) return res.writeHead(500).end();
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(req.url!.includes("items_count=2") ? page2 : page1));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
after(() => server.close());

test("devuelve las transferencias internas de todas las páginas, normalizadas", async () => {
  const transfers = await internalTransfers(url, "0xabc");
  assert.deepEqual(transfers, [
    { type: "staticcall", to: "0xae76beedd8dd39878d22e1b7a8ff96e5c5e8b17b", value: "0", success: true },
    { type: "call", to: "0xae76beedd8dd39878d22e1b7a8ff96e5c5e8b17b", value: "100000000000000", success: true },
    { type: "call", to: null, value: "5", success: false },
  ]);
  assert.equal(requested[0], "/api/v2/transactions/0xabc/internal-transactions");
  assert.equal(requested[1], "/api/v2/transactions/0xabc/internal-transactions?index=2&items_count=2");
});

test("si Blockscout responde con error → lanza (el pago seguirá en processing)", async () => {
  await assert.rejects(internalTransfers(url, "0xdead"), /Blockscout: HTTP 500/);
});
