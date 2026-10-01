"use client";

// Proveedores de la cartera para la página de pago: wagmi (conexión y transacciones) y React Query (lo exige wagmi).
// Solo carteras de navegador ("injected": MetaMask, Coinbase Wallet…), en Base Sepolia (test) y Base (live).
import { WagmiProvider, createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const config = createConfig({
  chains: [baseSepolia, base],
  connectors: [injected()],
  transports: { [baseSepolia.id]: http(), [base.id]: http() },
});

const queryClient = new QueryClient();

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
