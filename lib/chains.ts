// Red, contrato de USDC, nodo RPC, explorador Blockscout y cuándo se da un pago por bueno según el modo de la
// API key (ADR-007, ADR-008, ADR-013, ADR-015).
// Base produce un bloque cada 200 ms desde la actualización Denim (5-11-2026). En live no se cuentan bloques:
// se espera a que el del pago sea "safe", con su lote ya publicado en Ethereum (unos 2 min). En test basta
// con 2 bloques (< 1 s) para que las pruebas sean ágiles.
const NETWORKS = {
  test: {
    chainId: 84532, // Base Sepolia
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    confirmations: 2,
    head: "latest" as const, // cuenta desde el último bloque
    rpcUrl: () => process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org",
    blockscoutUrl: () => process.env.BASE_SEPOLIA_BLOCKSCOUT_URL ?? "https://base-sepolia.blockscout.com",
  },
  live: {
    chainId: 8453, // Base
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    confirmations: 1,
    head: "safe" as const, // cuenta desde el último bloque cuyo lote está publicado en Ethereum
    rpcUrl: () => process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    blockscoutUrl: () => process.env.BASE_BLOCKSCOUT_URL ?? "https://base.blockscout.com",
  },
};

export const network = (livemode: boolean) => (livemode ? NETWORKS.live : NETWORKS.test);
