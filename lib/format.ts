// Presentación en la página de pago: importes legibles y enlaces al explorador de bloques.
import { formatUnits } from "viem";

const DECIMALS = { usdc: 6, eth: 18 } as const;

// "1500000" USDC → "1.5 USDC"; "1000000000000000" ETH → "0.001 ETH".
export function formatAmount(amount: string, currency: "usdc" | "eth"): string {
  return `${formatUnits(BigInt(amount), DECIMALS[currency])} ${currency.toUpperCase()}`;
}

export function explorerTxUrl(chainId: number, txHash: string): string {
  return `https://${chainId === 8453 ? "" : "sepolia."}basescan.org/tx/${txHash}`;
}
