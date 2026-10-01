// Transferencias internas de una transacción, según Blockscout (explorador de bloques de código abierto) (ADR-015).
// Hacen falta para los pagos en ETH desde carteras inteligentes (EIP-7702, Safe…): el ETH no viaja en tx.value,
// sino en una llamada interna que el nodo estándar no muestra.

export type InternalTransfer = { type: string; to: string | null; value: string; success: boolean };

type Page = {
  items: { type: string; to: { hash: string } | null; value: string; success: boolean }[];
  next_page_params: Record<string, string | number> | null;
};

export async function internalTransfers(baseUrl: string, txHash: string): Promise<InternalTransfer[]> {
  const transfers: InternalTransfer[] = [];
  let query = "";
  // La API devuelve páginas; next_page_params dice cómo pedir la siguiente (null = no hay más).
  while (true) {
    const res = await fetch(`${baseUrl}/api/v2/transactions/${txHash}/internal-transactions${query}`);
    if (!res.ok) throw new Error(`Blockscout: HTTP ${res.status}`);
    const page: Page = await res.json();
    for (const item of page.items) {
      transfers.push({ type: item.type, to: item.to?.hash.toLowerCase() ?? null, value: item.value, success: item.success });
    }
    if (!page.next_page_params) return transfers;
    query = "?" + new URLSearchParams(Object.entries(page.next_page_params).map(([k, v]) => [k, String(v)])).toString();
  }
}
