// Decide si una transacción de la blockchain paga un pago (ADR-008, ADR-013, ADR-015).
// Función pura: no llama a la red ni a la base de datos. Recibe los datos tal como los devuelve el nodo.
import type { Currency } from "./money.ts";

export type Intent = {
  currency: Currency;
  amount: bigint; // unidades mínimas (USDC: 6 decimales; ETH: wei)
  payTo: string; // cartera del comercio
  tokenAddress: string | null; // contrato del token; null si la moneda es ETH
  createdAt: number; // segundos Unix
  // Cartera que firmó en el checkout (ADR-004, T13). Solo cuentan los fondos que salen de ella.
  // null en pagos enviados antes de existir esta regla.
  payer: string | null;
};

// Transferencia interna de ETH, ya normalizada por lib/blockscout.ts (direcciones en minúsculas).
export type InternalTransfer = { type: string; from: string; to: string | null; value: string; success: boolean };

// Respuestas del nodo, en hexadecimal (ver scripts/capture-tx.ts).
export type ChainTx = {
  transaction: { from: string; to: string | null; value: string };
  receipt: { status: string; logs: { address: string; topics: string[]; data: string }[] };
  block: { timestamp: string };
  // Transferencias internas según Blockscout (ADR-015). Solo se piden para ETH cuando tx.to no es el comercio.
  internalTransfers?: InternalTransfer[];
};

// tx_not_found no lo devuelve verify(): lo pone settle.ts cuando el nodo no conoce la transacción.
export type FailureCode =
  | "reverted"
  | "wrong_recipient"
  | "wrong_token"
  | "wrong_payer"
  | "amount_mismatch"
  | "tx_too_old"
  | "tx_not_found";

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

// ETH: el pago puede ir en la propia transacción (to + value) o, si sale de una cuenta inteligente
// (EIP-7702, Safe…), en llamadas internas con valor hacia el comercio (ADR-015). Se suma todo lo que llega.
// Solo cuentan las llamadas "call" que tuvieron éxito: un delegatecall no mueve ETH a otra cuenta.
// Y solo lo que sale del pagador: tx.from en la transferencia directa, el remitente en las internas (T13).
function receivedEth(intent: Intent, tx: ChainTx): bigint | "wrong_recipient" | "wrong_payer" {
  const direct = sameAddress(tx.transaction.to, intent.payTo) ? BigInt(tx.transaction.value) : null;
  const internal = (tx.internalTransfers ?? []).filter((t) => t.type === "call" && t.success && sameAddress(t.to, intent.payTo));
  if (direct === null && internal.length === 0) return "wrong_recipient";
  const directFromPayer = direct !== null && fromPayer(intent, tx.transaction.from);
  const internalFromPayer = internal.filter((t) => fromPayer(intent, t.from));
  if (!directFromPayer && internalFromPayer.length === 0) return "wrong_payer";
  return (directFromPayer ? direct : 0n) + internalFromPayer.reduce((sum, t) => sum + BigInt(t.value), 0n);
}

// Token ERC-20: se suman los eventos Transfer hacia el comercio emitidos por el contrato del token.
// En un Transfer, topics[2] es el destinatario (32 bytes: 12 de relleno + 20 de dirección) y data, el importe.
// topics[1] es quien envía los fondos, que puede no ser quien envía la transacción (p. ej. ERC-3009).
function receivedToken(intent: Intent, tx: ChainTx): bigint | "wrong_recipient" | "wrong_token" | "wrong_payer" {
  const toMerchant = tx.receipt.logs.filter(
    (log) => log.topics.length === 3 && log.topics[0] === TRANSFER_TOPIC && sameAddress("0x" + log.topics[2].slice(26), intent.payTo),
  );
  const fromToken = toMerchant.filter((log) => sameAddress(log.address, intent.tokenAddress));
  if (fromToken.length === 0) return toMerchant.length > 0 ? "wrong_token" : "wrong_recipient";
  const fromPayerLogs = fromToken.filter((log) => fromPayer(intent, "0x" + log.topics[1].slice(26)));
  if (fromPayerLogs.length === 0) return "wrong_payer";
  return fromPayerLogs.reduce((sum, log) => sum + BigInt(log.data), 0n);
}

// Pagos enviados antes de esta regla no tienen pagador guardado: se aceptan como hasta entonces.
function fromPayer(intent: Intent, sender: string | null): boolean {
  return intent.payer === null || sameAddress(sender, intent.payer);
}

// Las direcciones pueden venir con mayúsculas de checksum (EIP-55); se comparan en minúsculas.
function sameAddress(a: string | null, b: string | null): boolean {
  return a !== null && b !== null && a.toLowerCase() === b.toLowerCase();
}
