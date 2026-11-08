// Monedas que admite Instanta y cómo se muestran sus importes (ADR-007, ADR-013).
// Los importes viajan siempre en unidades mínimas (bigint, o string en JSON); los decimales solo se usan
// para mostrarlos o para leer lo que escribe una persona. Sin red ni BD: también se usa en el navegador.
import { formatUnits } from "viem";

export const CURRENCIES = ["usdc", "eth"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const DECIMALS: Record<Currency, number> = { usdc: 6, eth: 18 };

// "1500000" USDC → "1.5 USDC"; "1000000000000000" ETH → "0.001 ETH".
export function formatAmount(amount: string, currency: Currency): string {
  return `${formatUnits(BigInt(amount), DECIMALS[currency])} ${currency.toUpperCase()}`;
}
