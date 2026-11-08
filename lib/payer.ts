// Prueba de que el comprador controla la cartera desde la que va a pagar (ADR-004, T13).
// Antes de enviar los fondos firma este mensaje, ligado al pago; verify() solo cuenta lo que salga de esa cartera.
import { createPublicClient, http, recoverMessageAddress, type Hex } from "viem";
import { network } from "./chains.ts";

export const payerMessage = (paymentIntentId: string) => `Instanta: authorize payment ${paymentIntentId}`;

// Una cartera normal (EOA) se comprueba recuperando la dirección de la firma, sin red. Una cartera inteligente
// no tiene clave propia: el nodo pregunta a su contrato (ERC-1271, o ERC-6492 si aún no está desplegado).
export async function isPayerSignature(livemode: boolean, address: Hex, message: string, signature: Hex): Promise<boolean> {
  try {
    if ((await recoverMessageAddress({ message, signature })).toLowerCase() === address.toLowerCase()) return true;
  } catch {
    // no es una firma ECDSA de 65 bytes: puede ser de una cartera inteligente
  }
  try {
    const client = createPublicClient({ transport: http(network(livemode).rpcUrl()) });
    return await client.verifyMessage({ address, message, signature });
  } catch {
    return false;
  }
}
