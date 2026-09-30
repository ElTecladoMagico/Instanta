# 03 · Contrato de la API (OpenAPI)

**Fecha:** 30/09/2026

## Qué se hizo

Se escribió la especificación completa de la API pública en [`docs/api/openapi.yaml`](../api/openapi.yaml) (OpenAPI 3.1) **antes de programar ningún endpoint**, y se revisó con un agente especializado en seguridad.

## Por qué primero el contrato

- Obliga a decidir nombres, errores, paginación y estados antes de escribir código, cuando cambiarlos no cuesta nada.
- Es la documentación de la API y un anexo del TFG.
- Permite validar el diseño con herramientas (`redocly lint`) y con revisiones.

## Qué contiene

- **Pagos (`payment_intents`)**: crear, consultar, listar y cancelar. Autenticados con API key.
- **Checkout**: dos rutas públicas que usa la página de pago, autorizadas con el `client_secret` del pago en lugar de una API key.
- **Payment links**: la ruta que llama el botón embebible.
- **Webhooks y eventos**: registrar el endpoint del comercio y consultar el historial.
- **Salud del servicio** (`/v1/health`).
- Convenciones copiadas de Stripe: importes como string con un entero, errores con `{ error: { type, code, message, param } }`, paginación con `starting_after`, cabecera `Request-Id`, firma de webhooks `t=…,v1=…`.

## Revisión de seguridad

Un agente de revisión de seguridad comparó la spec con el modelo de amenazas. Hallazgos aplicados:

| Hallazgo | Corrección |
|---|---|
| Se podía enviar otro `tx_hash` mientras un pago estaba en `processing`, sustituyendo la transacción | `submit` solo se acepta en `requires_payment` |
| El `client_secret` va en la URL de la página de pago y se filtraría por la cabecera `Referer` a la web del comercio | La página responde con `Referrer-Policy: no-referrer` y no se registran esas URLs en logs |
| Los ids no exigían longitud mínima | Todos los ids llevan 128 bits aleatorios (32 caracteres hexadecimales) |
| Los endpoints públicos no preveían limitación | Respuesta `429` documentada |

Descartado: `Idempotency-Key` en los payment links. Un doble clic solo crea dos pagos que caducan solos.

## Commits

- `815805a` docs(api): add OpenAPI 3.1 contract for /v1 (ADR-005)
- `53d52b9` docs(api): apply security review to OpenAPI contract
