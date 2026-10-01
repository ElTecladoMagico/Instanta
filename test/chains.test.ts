// Red de cada modo. Este archivo se ejecuta en su propio proceso: aquí no hay URLs de nodo configuradas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { network } from "../lib/chains.ts";

test("test → Base Sepolia, 2 confirmaciones y nodo público por defecto", () => {
  delete process.env.BASE_SEPOLIA_RPC_URL;
  const net = network(false);
  assert.equal(net.chainId, 84532);
  assert.equal(net.confirmations, 2);
  assert.equal(net.rpcUrl(), "https://sepolia.base.org");
});

test("live → Base, 10 confirmaciones y nodo público por defecto", () => {
  delete process.env.BASE_RPC_URL;
  const net = network(true);
  assert.equal(net.chainId, 8453);
  assert.equal(net.confirmations, 10);
  assert.equal(net.rpcUrl(), "https://mainnet.base.org");
});
