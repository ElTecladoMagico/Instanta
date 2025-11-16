"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from '@/lib/wagmi-config'
import { ReactNode, useState } from 'react'

export function WidgetProviders({ children }: { children: ReactNode }) {
  // QueryClient es necesario para wagmi
  // Lo creamos con useState para que sea estable durante el ciclo de vida del componente
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}