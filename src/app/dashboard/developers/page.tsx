// Para el equipo técnico del comercio: API keys, endpoint de webhooks e historial de avisos.
import { listApiKeys } from "../../../../lib/merchants.ts";
import { endpointToApi, listEndpoints } from "../../../../lib/webhook-endpoints.ts";
import { listEvents } from "../../../../lib/events.ts";
import { authFor, getMerchant } from "../session.ts";
import { newApiKey, newWebhookEndpoint, removeWebhookEndpoint, resend, revokeKey } from "../actions.ts";
import { ActionForm } from "../ActionForm.tsx";

const card = "p-6 rounded-2xl bg-surface border border-outline-variant space-y-4";

export default async function DevelopersPage() {
  const merchant = await getMerchant();
  const auth = authFor(merchant);
  const [keys, endpoints, { rows: events }] = await Promise.all([listApiKeys(auth), listEndpoints(auth), listEvents(auth, { limit: 20 })]);
  const endpoint = endpoints[0] ? endpointToApi(endpoints[0]) : null;

  return (
    <section className="space-y-8">
      <h1 className="text-2xl font-bold text-on-surface">Developers</h1>

      <div className={card}>
        <h2 className="font-semibold">API keys</h2>
        <p className="text-sm text-on-surface-variant">Use them from your server: <code>Authorization: Bearer sk_test_…</code></p>
        <ul className="text-sm space-y-2">
          {keys.map((key) => (
            <li key={key.id} className="flex items-center justify-between">
              <code>{key.prefix}…</code>
              <span className="text-on-surface-variant">{key.created_at.toLocaleDateString("en-GB")}</span>
              {key.revoked ? (
                <span className="text-on-surface-variant">revoked</span>
              ) : (
                <form action={revokeKey}>
                  <input type="hidden" name="id" value={key.id} />
                  <button className="text-error">Revoke</button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <ActionForm action={newApiKey} submitLabel="Create API key" />
      </div>

      <div className={card}>
        <h2 className="font-semibold">Webhook endpoint</h2>
        {endpoint ? (
          <div className="flex items-center justify-between text-sm">
            <code className="break-all">{endpoint.url}</code>
            <form action={removeWebhookEndpoint}>
              <input type="hidden" name="id" value={endpoint.id} />
              <button className="text-error">Delete</button>
            </form>
          </div>
        ) : (
          <ActionForm action={newWebhookEndpoint} submitLabel="Add endpoint">
            <input name="url" placeholder="https://your-store.com/instanta-webhook" required className="w-full p-2 rounded-lg border border-outline-variant" />
          </ActionForm>
        )}
      </div>

      <div className={card}>
        <h2 className="font-semibold">Recent events</h2>
        {events.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No events yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-t border-outline-variant">
                  <td className="py-2">{event.type}</td>
                  <td className="py-2">{event.delivery_status}</td>
                  <td className="py-2 text-on-surface-variant">{event.created_at.toLocaleString("en-GB")}</td>
                  <td className="py-2 text-right">
                    {event.delivery_status === "failed" && (
                      <form action={resend}>
                        <input type="hidden" name="id" value={event.id} />
                        <button className="text-primary">Resend</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
