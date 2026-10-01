// Payment links: botones para webs sin backend (ADR-010).
import { listPaymentLinks } from "../../../../lib/merchants.ts";
import { formatAmount } from "../../../../lib/format.ts";
import { authFor, getMerchant } from "../session.ts";
import { newPaymentLink, toggleLink } from "../actions.ts";
import { ActionForm } from "../ActionForm.tsx";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function LinksPage() {
  const merchant = await getMerchant();
  const links = await listPaymentLinks(authFor(merchant));
  return (
    <section className="space-y-8">
      <h1 className="text-2xl font-bold text-on-surface">Payment links</h1>

      <div className="p-6 rounded-2xl bg-surface border border-outline-variant max-w-md">
        <h2 className="font-semibold mb-3">New payment link</h2>
        <ActionForm action={newPaymentLink} submitLabel="Create link">
          <input name="title" placeholder="Title (e.g. Ebook)" required className="w-full p-2 rounded-lg border border-outline-variant" />
          <div className="flex gap-2">
            <input name="amount" placeholder="Amount (e.g. 10.5)" required className="flex-1 p-2 rounded-lg border border-outline-variant" />
            <select name="currency" className="p-2 rounded-lg border border-outline-variant">
              <option value="usdc">USDC</option>
              <option value="eth">ETH</option>
            </select>
          </div>
        </ActionForm>
      </div>

      {links.map((link) => (
        <div key={link.id} className="p-6 rounded-2xl bg-surface border border-outline-variant space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{link.title}</p>
              <p className="text-sm text-on-surface-variant">{formatAmount(link.amount.toString(), link.currency)} · {link.active ? "active" : "inactive"}</p>
            </div>
            <form action={toggleLink}>
              <input type="hidden" name="id" value={link.id} />
              <input type="hidden" name="active" value={String(!link.active)} />
              <button className="text-sm text-primary">{link.active ? "Deactivate" : "Activate"}</button>
            </form>
          </div>
          <p className="text-xs text-on-surface-variant">Paste this on your website:</p>
          <pre className="text-xs p-3 rounded-xl bg-surface-container overflow-x-auto select-all">
{`<script src="${APP_URL}/button.js" defer></script>
<button data-instanta-link="${link.id}">Pay ${formatAmount(link.amount.toString(), link.currency)}</button>`}
          </pre>
        </div>
      ))}
    </section>
  );
}
