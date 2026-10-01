// Comprueba en la blockchain un pago en processing y guarda el resultado (ADR-008).
// Es la parte con efectos de la verificación: pide los datos al nodo, llama a verify() (pura)
// y aplica la transición de estado de ADR-007.
import { numeric, sql } from "./db.ts";
import { network } from "./chains.ts";
import { rpc } from "./rpc.ts";
import { internalTransfers, type InternalTransfer } from "./blockscout.ts";
import { verify, type ChainTx } from "./verify.ts";
import type { Row } from "./payment-intents.ts";

type Receipt = ChainTx["receipt"] & { blockNumber: string };

// Blockscout indexa las transferencias internas con algo de retraso. Si se consultaron y el pago no aparece,
// no se da por fallido hasta que el bloque tenga 10 minutos (ADR-015).
const INDEXING_GRACE_SECONDS = 600;

export async function checkPayment(row: Row): Promise<Row> {
  if (row.status !== "processing" || !row.tx_hash) return row;
  const { rpcUrl, blockscoutUrl, confirmations: required } = network(row.livemode);

  // 1. Datos de la blockchain. Si la transacción aún no está en un bloque, o el nodo falla,
  //    el pago sigue en processing y se volverá a comprobar más tarde.
  let chainTx: ChainTx;
  let confirmations: number;
  try {
    const url = rpcUrl();
    const [transaction, receipt] = await Promise.all([
      rpc<ChainTx["transaction"] | null>(url, "eth_getTransactionByHash", [row.tx_hash]),
      rpc<Receipt | null>(url, "eth_getTransactionReceipt", [row.tx_hash]),
    ]);
    if (!transaction || !receipt) return row;
    const [block, head] = await Promise.all([
      rpc<ChainTx["block"]>(url, "eth_getBlockByNumber", [receipt.blockNumber, false]),
      rpc<string>(url, "eth_blockNumber", []),
    ]);
    // ETH que no va directo al comercio: puede venir de una cuenta inteligente (EIP-7702, Safe…)
    // en una llamada interna. Solo entonces se consulta Blockscout (ADR-015).
    let internal: InternalTransfer[] | undefined;
    if (row.currency === "eth" && transaction.to?.toLowerCase() !== row.pay_to.toLowerCase()) {
      internal = await internalTransfers(blockscoutUrl(), row.tx_hash);
    }
    chainTx = { transaction, receipt, block, internalTransfers: internal };
    confirmations = Number(BigInt(head) - BigInt(receipt.blockNumber)) + 1;
  } catch {
    return row;
  }

  // 2. Decidir (función pura).
  const verdict = verify(
    {
      currency: row.currency as "usdc" | "eth",
      amount: row.amount,
      payTo: row.pay_to,
      tokenAddress: row.token_address,
      createdAt: Math.floor(row.created_at.getTime() / 1000),
    },
    chainTx,
    confirmations,
    required,
  );
  if (verdict.status === "processing") return row;
  const blockAge = Date.now() / 1000 - Number(BigInt(chainTx.block.timestamp));
  if (verdict.status === "failed" && chainTx.internalTransfers && blockAge < INDEXING_GRACE_SECONDS) return row;

  // 3. Guardar. La condición de estado evita pisar un cambio hecho por otro proceso.
  const [updated] = await sql<Row[]>`
    UPDATE payment_intents
    SET status = ${verdict.status},
        amount_received = ${numeric(verdict.amountReceived)},
        failure_code = ${verdict.status === "failed" ? verdict.code : null},
        succeeded_at = ${verdict.status === "succeeded" ? sql`now()` : null}
    WHERE id = ${row.id} AND status = 'processing'
    RETURNING *`;
  if (updated) return updated;
  const [current] = await sql<Row[]>`SELECT * FROM payment_intents WHERE id = ${row.id}`;
  return current;
}
