// Ajustes: nombre que ve el comprador y cartera donde se cobra.
import { getMerchant } from "../session.ts";
import { saveProfile } from "../actions.ts";
import { ActionForm } from "../ActionForm.tsx";

export default async function SettingsPage() {
  const merchant = await getMerchant();
  return (
    <section className="max-w-md space-y-6">
      <h1 className="text-2xl font-bold text-on-surface">Settings</h1>
      <div className="p-6 rounded-2xl bg-surface border border-outline-variant">
        <ActionForm action={saveProfile} submitLabel="Save">
          <label className="block text-sm">
            Business name (shown at checkout)
            <input name="name" defaultValue={merchant.name ?? ""} className="w-full mt-1 p-2 rounded-lg border border-outline-variant" />
          </label>
          <label className="block text-sm">
            Payout wallet on Base (payments go straight here)
            <input name="payout_address" defaultValue={merchant.payout_address ?? ""} placeholder="0x…" required
                   className="w-full mt-1 p-2 rounded-lg border border-outline-variant font-mono text-xs" />
          </label>
        </ActionForm>
      </div>
      <p className="text-xs text-on-surface-variant">Signed in as {merchant.email}</p>
    </section>
  );
}
