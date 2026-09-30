// Decide si una transacción de la blockchain paga un pago (ADR-008, ADR-013).
// Función pura: no llama a la red ni a la base de datos. Recibe los datos tal como los devuelve el nodo.

export type Intent = {
  currency: "usdc" | "eth";
  amount: bigint; // unidades mínimas (USDC: 6 decimales; ETH: wei)
  payTo: string; // cartera del comercio
  tokenAddress: string | null; // contrato del token; null si la moneda es ETH
  createdAt: number; // segundos Unix
};

// Respuestas del nodo, en hexadecimal (ver scripts/capture-tx.ts).
export type ChainTx = {
  transaction: { to: string | null; value: string };
  receipt: { status: string; logs: { address: string; topics: string[]; data: string }[] };
  block: { timestamp: string };
};

export type FailureCode = "reverted" | "wrong_recipient" | "wrong_token" | "amount_mismatch" | "tx_too_old";

export type Verdict =
  | { status: "succeeded"; amountReceived: bigint }
  | { status: "processing" }
  | { status: "failed"; code: FailureCode; amountReceived: bigint };

// keccak256("Transfer(address,address,uint256)"): identifica el evento Transfer de un token ERC-20.
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export function verify(intent: Intent, tx: ChainTx, confirmations: number, requiredConfirmations: number): Verdict {
  // 1. La transacción tiene que haber tenido éxito.
  if (tx.receipt.status !== "0x1") return { status: "failed", code: "reverted", amountReceived: 0n };

  // 2. ¿Cuánto le llegó al comercio, en la moneda del pago?
  const received = intent.currency === "eth" ? receivedEth(intent, tx) : receivedToken(intent, tx);
  if (typeof received === "string") return { status: "failed", code: received, amountReceived: 0n };

  // 3. Importe suficiente. Pagar de más se acepta y queda registrado.
  if (received < intent.amount) return { status: "failed", code: "amount_mismatch", amountReceived: received };

  // 4. La transacción no puede ser anterior al pago: evita reutilizar un pago antiguo (ADR-004, T4).
  if (Number(BigInt(tx.block.timestamp)) < intent.createdAt) {
    return { status: "failed", code: "tx_too_old", amountReceived: received };
  }

  // 5. Todo correcto, pero hay que esperar a tener suficientes confirmaciones.
  if (confirmations < requiredConfirmations) return { status: "processing" };

  return { status: "succeeded", amountReceived: received };
}

// ETH: la propia transacción lleva el destinatario (to) y el importe (value).
function receivedEth(intent: Intent, tx: ChainTx): bigint | "wrong_recipient" {
  return sameAddress(tx.transaction.to, intent.payTo) ? BigInt(tx.transaction.value) : "wrong_recipient";
}

// Token ERC-20: se suman los eventos Transfer hacia el comercio emitidos por el contrato del token.
// En un Transfer, topics[2] es el destinatario (32 bytes: 12 de relleno + 20 de dirección) y data, el importe.
function receivedToken(intent: Intent, tx: ChainTx): bigint | "wrong_recipient" | "wrong_token" {
  const toMerchant = tx.receipt.logs.filter(
    (log) => log.topics.length === 3 && log.topics[0] === TRANSFER_TOPIC && sameAddress("0x" + log.topics[2].slice(26), intent.payTo),
  );
  const fromToken = toMerchant.filter((log) => sameAddress(log.address, intent.tokenAddress));
  if (fromToken.length === 0) return toMerchant.length > 0 ? "wrong_token" : "wrong_recipient";
  return fromToken.reduce((sum, log) => sum + BigInt(log.data), 0n);
}

// Las direcciones pueden venir con mayúsculas de checksum (EIP-55); se comparan en minúsculas.
function sameAddress(a: string | null, b: string | null): boolean {
  return a !== null && b !== null && a.toLowerCase() === b.toLowerCase();
}
