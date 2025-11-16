"use client";

// This file is a simplified layout specifically for the widget iframe.
// We use wagmi for wallet connections and transactions.
import { WagmiProvider, createConfig, http } from "wagmi";
import { baseSepolia, mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Wagmi configuration
const config = createConfig({
  chains: [mainnet, baseSepolia],
  transports: {
    [mainnet.id]: http(),
    [baseSepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The WagmiProvider makes wallet hooks available to its children
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {/* We add a simple white background for the iframe body */}
        <body style={{ backgroundColor: "white" }}>{children}</body>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
