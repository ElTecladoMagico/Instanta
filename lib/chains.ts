// Red, contrato de USDC, nodo RPC, explorador Blockscout y confirmaciones exigidas según el modo de la API key
// (ADR-007, ADR-008, ADR-013, ADR-015).
// Base produce un bloque cada ~2 s: 2 confirmaciones ≈ 4 s en test; 10 ≈ 20 s en live.
const NETWORKS = {
  test: {
    chainId: 84532, // Base Sepolia
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    confirmations: 2,
    rpcUrl: () => process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org",
    blockscoutUrl: () => process.env.BASE_SEPOLIA_BLOCKSCOUT_URL ?? "https://base-sepolia.blockscout.com",
  },
  live: {
    chainId: 8453, // Base
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    confirmations: 10,
    rpcUrl: () => process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    blockscoutUrl: () => process.env.BASE_BLOCKSCOUT_URL ?? "https://base.blockscout.com",
  },
};

export const network = (livemode: boolean) => (livemode ? NETWORKS.live : NETWORKS.test);
