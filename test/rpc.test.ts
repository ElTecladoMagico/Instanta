// rpc() contra un nodo falso: un servidor HTTP local que responde como un nodo JSON-RPC.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { rpc } from "../lib/rpc.ts";

let server: Server;
let url = "";
let lastRequest: unknown;

before(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      lastRequest = JSON.parse(body);
      const { method } = lastRequest as { method: string };
      if (method === "http_error") return res.writeHead(500).end();
      res.writeHead(200, { "content-type": "application/json" });
      if (method === "rpc_error") return res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -32000, message: "boom" } }));
      res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x10" }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  url = `http://127.0.0.1:${address.port}`;
});

after(() => server.close());

test("rpc envía una petición JSON-RPC 2.0 y devuelve result", async () => {
  const result = await rpc(url, "eth_blockNumber", []);
  assert.equal(result, "0x10");
  assert.deepEqual(lastRequest, { jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] });
});

test("rpc lanza un error si el nodo responde con error JSON-RPC", async () => {
  await assert.rejects(rpc(url, "rpc_error", []), /rpc_error: boom/);
});

test("rpc lanza un error si la respuesta HTTP no es 2xx", async () => {
  await assert.rejects(rpc(url, "http_error", []), /http_error: HTTP 500/);
});
