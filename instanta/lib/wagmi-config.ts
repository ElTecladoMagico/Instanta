import { http, createConfig } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { coinbaseWallet, metaMask, walletConnect } from 'wagmi/connectors'

// Configuración de wagmi para nuestro checkout
// Esto le dice a wagmi qué wallets soportamos y cómo conectarse a Base Sepolia
export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    metaMask(), // Soporte para MetaMask
    coinbaseWallet({
      appName: 'SimplePay',
      // Esto permite que Coinbase Wallet funcione sin API key en testnet
    }),
  ],
  transports: {
    // Este es el RPC endpoint que wagmi usará para comunicarse con Base Sepolia
    // Usamos Alchemy porque es confiable y tiene buen soporte para Base
    [baseSepolia.id]: http(
      `https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
    ),
  },
})