// Guarda una transacción real de Base Sepolia como fixture para los tests de verify() (ADR-011).
// Uso: node scripts/capture-tx.ts <nombre> <tx_hash>   →   test/fixtures/<nombre>.json
// Se guardan tal cual las respuestas del nodo (en hexadecimal), que es lo que recibirá verify(),
// y las transferencias internas según Blockscout (ADR-015).
import { writeFile } from "node:fs/promises";
import { rpc } from "../lib/rpc.ts";
import { internalTransfers } from "../lib/blockscout.ts";
import { network } from "../lib/chains.ts";

const [name, hash] = process.argv.slice(2);
if (!name || !/^0x[0-9a-fA-F]{64}$/.test(hash ?? "")) {
  console.error("Uso: node scripts/capture-tx.ts <nombre> <tx_hash>");
  process.exit(1);
}

const url = network(false).rpcUrl();
const transaction = await rpc<{ blockNumber: string }>(url, "eth_getTransactionByHash", [hash]);
const receipt = await rpc(url, "eth_getTransactionReceipt", [hash]);
const block = await rpc<{ number: string; timestamp: string }>(url, "eth_getBlockByNumber", [transaction.blockNumber, false]);

const internal = await internalTransfers(network(false).blockscoutUrl(), hash);

const fixture = {
  transaction,
  receipt,
  block: { number: block.number, timestamp: block.timestamp },
  internalTransfers: internal,
};
await writeFile(new URL(`../test/fixtures/${name}.json`, import.meta.url), JSON.stringify(fixture, null, 2) + "\n");
console.log(`test/fixtures/${name}.json`);
