// Llamada mínima a un nodo de Base/Ethereum. JSON-RPC es solo un POST con un JSON: no hace falta librería.
// 10 s de espera como máximo, igual que los webhooks: un nodo sano responde en milisegundos, y uno colgado
// no puede parar la vuelta del worker (el pago sigue en processing y se reintenta en la siguiente).
export async function rpc<T = unknown>(url: string, method: string, params: unknown[], timeoutMs = 10_000): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`RPC ${method}: HTTP ${res.status}`);
  const body = await res.json();
  if (body.error) throw new Error(`RPC ${method}: ${body.error.message}`);
  return body.result as T;
}
