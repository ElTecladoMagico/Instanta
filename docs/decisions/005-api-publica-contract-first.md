# ADR-005: API pública tipo Stripe, diseñada primero en OpenAPI

**Fecha:** 30 de septiembre de 2026  
**Estado:** Propuesta  
**Contexto:** Instanta solo se integra hoy con un botón HTML; un comercio con backend no tiene forma de crear ni consultar pagos

---

## Problema

La única integración es `button.js`: sirve para una web estática, pero un comercio con tienda propia necesita crear pagos desde su servidor, consultar su estado y enterarse cuando se completan. Es lo que ofrece Stripe y lo que el producto quiere demostrar.

## Opciones Evaluadas

### Opción A: Escribir los endpoints y documentarlos después (descartada)

La documentación acaba describiendo lo que salió, no lo que se diseñó, y las inconsistencias (nombres, errores, paginación) se descubren tarde.

### Opción B: GraphQL o tRPC (descartada)

tRPC solo sirve a clientes TypeScript del mismo repo. GraphQL es más difícil de consumir con `curl` y se aleja del modelo que los comercios ya conocen por Stripe.

### Opción C: REST, spec OpenAPI 3.1 escrita primero (elegida)

`docs/api/openapi.yaml` se escribe y se revisa **antes** del código. Es el contrato, la documentación y un anexo del TFG.

## Diseño (siguiendo las convenciones de Stripe)

**Versionado:** prefijo `/v1` en la ruta.

**Autenticación:** `Authorization: Bearer sk_test_...` (ver ADR-006).

**Recursos de la primera versión:**

| Método y ruta | Qué hace |
|---|---|
| `POST /v1/payment_intents` | Crea un pago: `amount` (entero en unidades mínimas, como string), `currency: "usdc"`, `description`, `metadata` |
| `GET /v1/payment_intents/:id` | Consulta un pago |
| `GET /v1/payment_intents?limit=&starting_after=` | Lista con paginación por cursor |
| `POST /v1/payment_intents/:id/cancel` | Cancela si aún no se ha pagado |
| `POST /v1/webhook_endpoints` · `GET` · `DELETE` | Gestión de webhooks |
| `GET /v1/events/:id` · `GET /v1/events` | Consulta de eventos |
| `GET /v1/health` | Estado del servicio |

Rutas del checkout, autenticadas con `client_secret` en vez de API key (ver ADR-010):

| Método y ruta | Qué hace |
|---|---|
| `GET /v1/checkout/:client_secret` | Datos para pagar: importe, `pay_to`, token, `chain_id` |
| `POST /v1/checkout/:client_secret/submit` | El comprador envía `{ tx_hash }` |

**Objeto `payment_intent`:**

```json
{
  "id": "pi_3xK...",
  "object": "payment_intent",
  "livemode": false,
  "amount": "10000000",
  "amount_received": "0",
  "currency": "usdc",
  "status": "requires_payment",
  "pay_to": "0xabc...",
  "chain_id": 84532,
  "token_address": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "tx_hash": null,
  "client_secret": "pi_3xK..._secret_9fQ...",
  "checkout_url": "https://.../pay/pi_3xK..._secret_9fQ...",
  "description": "Camiseta talla M",
  "metadata": { "order_id": "1234" },
  "created": 1790000000,
  "expires_at": 1790003600
}
```

**Errores:** siempre la misma forma y el código HTTP correcto (`400`, `401`, `404`, `409`, `422`, `500`):

```json
{ "error": { "type": "invalid_request_error", "code": "tx_already_used", "message": "...", "param": "tx_hash" } }
```

**Cada respuesta** lleva cabecera `Request-Id: req_...`, que también aparece en los logs.

## Aplazado explícitamente

- **`Idempotency-Key`:** un intent duplicado no causa daño (si no se paga, caduca). Se añade cuando un cliente real necesite reintentar creaciones con seguridad.
- **Claves publicables (`pk_`):** el checkout usa `client_secret`, así que no hacen falta todavía.
- **SDK en npm:** la documentación incluye ejemplos con `curl` y `fetch`.
- **Payment Links como recurso propio:** los botones actuales se resuelven como plantillas (ver ADR-010).

## Consecuencias

- Cualquier cambio en la API empieza por cambiar la spec.
- La spec permite generar la página de documentación (Redoc/Scalar como HTML estático) sin escribir documentación aparte.

## Decisión

API REST `/v1` con convenciones de Stripe, definida primero en `docs/api/openapi.yaml`.
