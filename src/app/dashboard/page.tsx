// Pagos del comercio: los 50 más recientes.
import { listPaymentIntents } from "../../../lib/payment-intents.ts";
import { explorerTxUrl, formatAmount } from "../../../lib/format.ts";
import { authFor, getMerchant } from "./session.ts";

const STATUS_STYLE: Record<string, string> = {
  succeeded: "bg-success-container text-on-success-container",
  processing: "bg-primary-container text-on-primary-container",
  failed: "bg-error-container text-on-error-container",
};

export default async function PaymentsPage() {
  const merchant = await getMerchant();
  const { rows } = await listPaymentIntents(authFor(merchant), { limit: 50 });
  return (
    <section>
      <h1 className="text-2xl font-bold text-on-surface mb-6">Payments</h1>
      {rows.length === 0 ? (
        <p className="text-on-surface-variant">No payments yet. Create one with the API or share a payment link.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-outline-variant bg-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-on-surface-variant">
              <tr>{["Amount", "Status", "Description", "Created", "Transaction"].map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((pi) => (
                <tr key={pi.id} className="border-t border-outline-variant">
                  <td className="p-3 font-medium">{formatAmount(pi.amount.toString(), pi.currency as "usdc" | "eth")}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${STATUS_STYLE[pi.status] ?? "bg-surface-container"}`}>{pi.status}</span>
                    {pi.failure_code && <span className="ml-2 text-xs text-error">{pi.failure_code}</span>}
                  </td>
                  <td className="p-3 text-on-surface-variant">{pi.description ?? "—"}</td>
                  <td className="p-3 text-on-surface-variant">{pi.created_at.toLocaleString("en-GB")}</td>
                  <td className="p-3">
                    {pi.tx_hash ? (
                      <a href={explorerTxUrl(pi.chain_id, pi.tx_hash)} target="_blank" rel="noopener noreferrer" className="text-primary font-mono">
                        {pi.tx_hash.slice(0, 10)}…
                      </a>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
