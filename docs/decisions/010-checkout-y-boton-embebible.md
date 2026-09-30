# ADR-010: Checkout alojado y botón embebible sobre PaymentIntents

**Fecha:** 30 de septiembre de 2026  
**Estado:** Propuesta  
**Contexto:** El checkout actual depende de Convex, genera el id del pago en el navegador y cobra en ETH

---

## Problema

Hay dos formas de que un comprador llegue a pagar, y hoy solo existe una:

1. **Sin código:** el comercio pega un botón en su web (`button.js`). Es lo que existe.
2. **Con API:** el servidor del comercio crea un PaymentIntent y redirige al comprador a una página de pago (como Stripe Checkout). No existe.

Además, el checkout actual crea el pago con un id generado en el navegador (`Math.random()`) y llama directamente a mutations de Convex.

## Opciones Evaluadas

### Opción A: Mantener el iframe actual y añadir otra página para la API (descartada)

Dos flujos de pago distintos que mantener y dos sitios donde se pueden colar fallos de seguridad.

### Opción B: Una sola página de checkout; el botón es un atajo para crear un PaymentIntent (elegida)

Todo pago es un `payment_intent`. Solo cambia quién lo crea:

| Integración | Quién crea el intent | Cómo llega el comprador |
|---|---|---|
| API | El servidor del comercio con `POST /v1/payment_intents` | Redirección a `checkout_url` |
| Botón (`button.js`) | Instanta, al hacer clic, a partir de la plantilla del botón | Se abre la misma página en un iframe o ventana |

## Diseño

**Página única:** `/pay/:client_secret`.

- `client_secret` = `pi_<id>_secret_<aleatorio>`. En la BD se guarda solo su hash.
- Solo permite **leer los datos de pago de ese intent y enviar su `tx_hash`**. No sirve para nada más, así que puede viajar en la URL sin riesgo para el comercio.
- La página pide los datos con `GET /v1/checkout/:client_secret`, conecta la cartera con wagmi, llama a `transfer` del contrato USDC y envía el hash con `POST .../submit`.
- El estado se actualiza consultando cada 2–3 s (sustituye la reactividad de Convex). Si se necesitara tiempo real, *Server-Sent Events*.
- Al terminar: pantalla de éxito y, si el intent tiene `return_url`, redirección al comercio.

**Botones = plantillas:** la tabla `buttons` actual pasa a ser `payment_links` (`id`, `merchant_id`, `amount`, `title`, `active`). Al hacer clic:

```
button.js → POST /v1/payment_links/:id/checkout (público)
          → crea un payment_intent con importe y destino del enlace
          → devuelve checkout_url
          → abre /pay/... en iframe
```

El importe y el destino salen siempre del enlace en la BD, nunca del HTML del comercio.

**Snippet del comercio (se mantiene igual de simple):**

```html
<script src="https://<dominio>/button.js" defer></script>
<button data-instanta-link="pl_...">Pagar 10 USDC</button>
```

## Consecuencias

- `payment_links` suma una sexta tabla; se acepta porque es lo que ven los comercios sin backend y ya existe en el producto.
- El endpoint público de enlaces permite crear intents sin autenticación. Para limitar el abuso: los intents caducan en 1 hora y el worker los marca `expired`. Rate limiting por IP, si hace falta.
- Se borran `src/app/widget/` y las mutations de Convex del checkout.

## Decisión

Un solo checkout alojado en `/pay/:client_secret`. El botón embebible se convierte en un *payment link* que crea un PaymentIntent en el servidor y abre ese mismo checkout.
