// Transferencias internas de una transacción, según Blockscout (explorador de bloques de código abierto) (ADR-015).
// Hacen falta para los pagos en ETH desde carteras inteligentes (EIP-7702, Safe…): el ETH no viaja en tx.value,
// sino en una llamada interna que el nodo estándar no muestra.
// Es un adaptador: traduce la respuesta de Blockscout al tipo que define el núcleo (verify.ts).
import type { InternalTransfer } from "./verify.ts";

type Page = {
  items: { type: string; from: { hash: string }; to: { hash: string } | null; value: string; success: boolean }[];
  next_page_params: Record<string, string | number> | null;
};

// Como mucho 20 páginas (unas 1000 transferencias internas, a unas 50 por página): un pago normal tiene unas pocas.
// Si hay más, se lanza un error y el pago sigue en processing, en vez de dar por fallido un pago que quizá
// está en la página 21. Y 10 s de espera por página, como en rpc.ts.
const MAX_PAGES = 20;

export async function internalTransfers(baseUrl: string, txHash: string, timeoutMs = 10_000): Promise<InternalTransfer[]> {
  const transfers: InternalTransfer[] = [];
  let query = "";
  // La API devuelve páginas; next_page_params dice cómo pedir la siguiente (null = no hay más).
  for (let pages = 0; pages < MAX_PAGES; pages++) {
    const res = await fetch(`${baseUrl}/api/v2/transactions/${txHash}/internal-transactions${query}`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`Blockscout: HTTP ${res.status}`);
    const page: Page = await res.json();
    for (const item of page.items) {
      transfers.push({
        type: item.type,
        from: item.from.hash.toLowerCase(),
        to: item.to?.hash.toLowerCase() ?? null,
        value: item.value,
        success: item.success,
      });
    }
    if (!page.next_page_params) return transfers;
    query = "?" + new URLSearchParams(Object.entries(page.next_page_params).map(([k, v]) => [k, String(v)])).toString();
  }
  throw new Error(`Blockscout: más de ${MAX_PAGES} páginas de transferencias internas`);
}
