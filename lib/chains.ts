// Red y contrato de USDC que corresponden a cada modo de la API key (ADR-007, ADR-013).
const NETWORKS = {
  test: { chainId: 84532, usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" }, // Base Sepolia
  live: { chainId: 8453, usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" }, // Base
};

export const network = (livemode: boolean) => (livemode ? NETWORKS.live : NETWORKS.test);
