// Pagos (PaymentIntents): validación de entradas y SQL de crear, consultar, listar y cancelar (ADR-005, ADR-007).
// Cada consulta filtra por comercio y por modo: nadie ve los pagos de otro (ADR-004, T6).
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { numeric, sql } from "./db.ts";
import { newId, sha256 } from "./ids.ts";
import { network } from "./chains.ts";
import type { Auth } from "./api-keys.ts";
import { recordEvent } from "./events.ts";

const STATUSES = ["requires_payment", "processing", "succeeded", "failed", "canceled", "expired"] as const;

// Lo que puede enviar el comercio al crear un pago. strictObject rechaza cualquier otro campo,
// así que el cliente no puede elegir pay_to, la red ni el token (ADR-004, T5).
export const CreateParams = z.strictObject({
  amount: z.string().regex(/^[1-9][0-9]{0,77}$/, "must be a positive integer in the smallest unit, as a string"),
  currency: z.enum(["usdc", "eth"]),
  description: z.string().max(500).optional(),
  metadata: z
    .record(z.string(), z.string().max(500))
    .refine((m) => Object.keys(m).length <= 20, "at most 20 keys")
    .optional(),
  return_url: z.url({ protocol: /^https?$/ }).optional(),
  expires_in: z.int().min(300).max(86400).optional(),
});

export const ListParams = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  starting_after: z.string().optional(),
  status: z.enum(STATUSES).optional(),
});

export type Row = {
  id: string;
  merchant_id: string;
  livemode: boolean;
  amount: bigint;
  amount_received: bigint;
  currency: string;
  status: string;
  failure_code: string | null;
  pay_to: string;
  chain_id: number;
  token_address: string | null;
  tx_hash: string | null;
  description: string | null;
  metadata: Record<string, string>;
  return_url: string | null;
  created_at: Date;
  expires_at: Date;
  succeeded_at: Date | null;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const unix = (date: Date | null) => (date ? Math.floor(date.getTime() / 1000) : null);

// Fila de la BD → objeto de la API. El client_secret solo existe en la respuesta de creación:
// en la BD solo se guarda su hash (ADR-010).
export function toApi(row: Row, clientSecret: string | null = null) {
  return {
    id: row.id,
    object: "payment_intent",
    livemode: row.livemode,
    amount: row.amount.toString(),
    amount_received: row.amount_received.toString(),
    currency: row.currency,
    status: row.status,
    failure_code: row.failure_code,
    pay_to: row.pay_to,
    chain_id: row.chain_id,
    token_address: row.token_address,
    tx_hash: row.tx_hash,
    client_secret: clientSecret,
    checkout_url: clientSecret ? `${APP_URL}/pay/${clientSecret}` : null,
    description: row.description,
    metadata: row.metadata,
    return_url: row.return_url,
    created: unix(row.created_at),
    expires_at: unix(row.expires_at),
    succeeded_at: unix(row.succeeded_at),
  };
}

// Crea el pago con la cartera, la red y el token que fija el servidor.
// paymentLinkId: el enlace de pago del que sale, si lo crea el botón embebible (ADR-010).
// Devuelve null si el comercio aún no tiene cartera de cobro.
export async function createPaymentIntent(auth: Auth, params: z.infer<typeof CreateParams>, paymentLinkId: string | null = null) {
  const id = newId("pi");
  const clientSecret = `${id}_secret_${randomBytes(16).toString("hex")}`;
  const { chainId, usdc } = network(auth.livemode);
  // INSERT … SELECT: si el comercio no tiene payout_address, no se inserta nada.
  const [row] = await sql<Row[]>`
    INSERT INTO payment_intents
      (id, merchant_id, payment_link_id, livemode, amount, currency, chain_id, token_address, pay_to,
       client_secret_hash, description, metadata, return_url, expires_at)
    SELECT ${id}, id, ${paymentLinkId}, ${auth.livemode}, ${numeric(BigInt(params.amount))}, ${params.currency}, ${chainId},
           ${params.currency === "usdc" ? usdc : null}, payout_address,
           ${sha256(clientSecret)}, ${params.description ?? null}, ${sql.json(params.metadata ?? {})},
           ${params.return_url ?? null}, now() + make_interval(secs => ${params.expires_in ?? 3600})
    FROM merchants
    WHERE id = ${auth.merchantId} AND payout_address IS NOT NULL
    RETURNING *`;
  return row ? { row, clientSecret } : null;
}

// Caducidad perezosa (ADR-007): antes de leer, los pagos sin pagar que pasaron de expires_at pasan a expired,
// cada uno con su evento en la misma transacción (ADR-009). El alcance es un comercio y modo, o un checkout.
export async function expirePayments(scope: Auth | { clientSecretHash: string }) {
  await sql.begin(async (tx) => {
    const rows = await tx<Row[]>`
      UPDATE payment_intents SET status = 'expired'
      WHERE ${"clientSecretHash" in scope
          ? tx`client_secret_hash = ${scope.clientSecretHash}`
          : tx`merchant_id = ${scope.merchantId} AND livemode = ${scope.livemode}`}
        AND status = 'requires_payment' AND expires_at < now()
      RETURNING *`;
    for (const row of rows) await recordEvent(tx, row, "payment_intent.expired");
  });
}

export async function getPaymentIntent(auth: Auth, id: string): Promise<Row | null> {
  await expirePayments(auth);
  const [row] = await sql<Row[]>`
    SELECT * FROM payment_intents
    WHERE id = ${id} AND merchant_id = ${auth.merchantId} AND livemode = ${auth.livemode}`;
  return row ?? null;
}

// Más recientes primero. Paginación por cursor: starting_after es el último id de la página anterior.
// Se pide un elemento de más para saber si hay otra página (has_more).
export async function listPaymentIntents(auth: Auth, params: z.infer<typeof ListParams>) {
  await expirePayments(auth);
  const rows = await sql<Row[]>`
    SELECT * FROM payment_intents
    WHERE merchant_id = ${auth.merchantId} AND livemode = ${auth.livemode}
    ${params.status ? sql`AND status = ${params.status}` : sql``}
    ${
      params.starting_after
        ? sql`AND (created_at, id) < (SELECT created_at, id FROM payment_intents
                                      WHERE id = ${params.starting_after} AND merchant_id = ${auth.merchantId})`
        : sql``
    }
    ORDER BY created_at DESC, id DESC
    LIMIT ${params.limit + 1}`;
  return { rows: rows.slice(0, params.limit), hasMore: rows.length > params.limit };
}

// Solo se puede cancelar un pago en requires_payment. El UPDATE con la condición de estado
// es la transición de ADR-007: si otro proceso ya lo cambió, no se toca.
export async function cancelPaymentIntent(auth: Auth, id: string): Promise<Row | "not_found" | "unexpected_state"> {
  await expirePayments(auth);
  const row = await sql.begin(async (tx) => {
    const [canceled] = await tx<Row[]>`
      UPDATE payment_intents SET status = 'canceled'
      WHERE id = ${id} AND merchant_id = ${auth.merchantId} AND livemode = ${auth.livemode}
        AND status = 'requires_payment'
      RETURNING *`;
    if (canceled) await recordEvent(tx, canceled, "payment_intent.canceled");
    return canceled;
  });
  if (row) return row;
  return (await getPaymentIntent(auth, id)) ? "unexpected_state" : "not_found";
}
