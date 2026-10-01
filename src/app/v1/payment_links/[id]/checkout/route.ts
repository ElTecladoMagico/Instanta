// POST /v1/payment_links/:id/checkout — lo llama button.js al hacer clic (público, sin API key).
import { apiError, notFound, ok } from "../../../../../../lib/http.ts";
import { checkoutFromLink } from "../../../../../../lib/payment-links.ts";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await checkoutFromLink(id);

  const response =
    result === "not_found" ? notFound("payment_link", id)
    : result === "payout_address_missing" ? apiError(422, "invalid_request_error", "payout_address_missing", "This merchant has no payout wallet yet.")
    : ok({ checkout_url: result.checkoutUrl }, 201);

  // button.js se ejecuta en la web del comercio (otro dominio). Sin esta cabecera, el navegador
  // no le dejaría leer la respuesta. Es seguro: el endpoint no usa cookies ni devuelve datos privados.
  response.headers.set("Access-Control-Allow-Origin", "*");
  return response;
}
