// Nodo de Base falso para los tests: un servidor HTTP local que responde JSON-RPC con los fixtures reales
// y, en GET /api/v2/…, como la API de Blockscout con sus transferencias internas (ADR-015).
// Cada test le dice qué fixture servir bajo qué hash (así varios tests usan la misma transacción real sin
// chocar con el UNIQUE(tx_hash) de la base de datos).
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import type { ChainTx } from "../../lib/verify.ts";

export type Fixture = ChainTx & { block: { number: string; timestamp: string } };

export const loadFixture = (name: string): Fixture =>
  JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));

export const randomTxHash = () => "0x" + randomBytes(32).toString("hex");

export async function startFakeNode() {
  const served = new Map<string, Fixture>();
  const blocks = new Map<string, Fixture["block"]>(); // por número; el último servido manda
  let head = "0xffffffff"; // por defecto, muchísimas confirmaciones
  let down = false;
  let blockscoutDown = false;

  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      if (req.method === "GET") return blockscout(req.url!, res);
      if (down) return res.writeHead(503).end();
      const { method, params } = JSON.parse(body);
      const fixture = served.get(params[0]);
      const result =
        method === "eth_getTransactionByHash" ? (fixture?.transaction ?? null)
        : method === "eth_getTransactionReceipt" ? (fixture?.receipt ?? null)
        : method === "eth_getBlockByNumber" ? (blocks.get(params[0]) ?? null)
        : method === "eth_blockNumber" ? head
        : null;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result }));
    });
  });
  // GET /api/v2/transactions/:hash/internal-transactions → las del fixture, en el formato de Blockscout.
  function blockscout(url: string, res: import("node:http").ServerResponse) {
    if (blockscoutDown) return res.writeHead(503).end();
    const hash = url.split("/")[4];
    const items = (served.get(hash)?.internalTransfers ?? []).map((t) => ({ ...t, to: t.to ? { hash: t.to } : null }));
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ items, next_page_params: null }));
  }

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };

  return {
    url: `http://127.0.0.1:${port}`,
    // Sirve el fixture bajo este hash: el nodo responderá como si esa transacción existiera.
    serve: (hash: string, fixture: Fixture) => {
      served.set(hash.toLowerCase(), fixture);
      blocks.set(fixture.block.number, fixture.block);
    },
    // Fija el bloque actual como "bloque de la transacción + n - 1", es decir, n confirmaciones.
    setConfirmations: (fixture: Fixture, n: number) => (head = "0x" + (BigInt(fixture.block.number) + BigInt(n - 1)).toString(16)),
    setDown: (value: boolean) => (down = value),
    setBlockscoutDown: (value: boolean) => (blockscoutDown = value),
    close: () => server.close(),
  };
}
