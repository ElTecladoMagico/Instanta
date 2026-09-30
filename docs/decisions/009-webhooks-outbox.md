# ADR-009: Webhooks — outbox en Postgres, firma HMAC y reintentos

**Fecha:** 30 de septiembre de 2026  
**Estado:** Propuesta  
**Contexto:** El servidor del comercio necesita enterarse de que un pago se ha completado sin estar consultando

---

## Problema

Un comercio con tienda propia necesita marcar el pedido como pagado en cuanto se confirma el pago. Consultar `GET /v1/payment_intents/:id` en bucle no escala ni es cómodo. Stripe lo resuelve con webhooks: una petición HTTP firmada al servidor del comercio.

Hay tres riesgos: **perder el aviso** (el servidor cae entre confirmar el pago y enviar el webhook), **que el comercio no esté disponible** y **que alguien falsifique el aviso**.

## Opciones Evaluadas

### Opción A: Enviar el webhook justo después de cambiar el estado (descartada)

Si el proceso cae entre el `UPDATE` y la petición HTTP, el aviso se pierde para siempre. Si el comercio está caído, no hay segundo intento.

### Opción B: Cola externa (Redis + BullMQ) (descartada)

ADR-001 la preveía, pero añade un servicio y una dependencia cuando Postgres ya puede hacer de cola. Además, escribir en Redis y en Postgres no es atómico: se vuelve al problema de la opción A.

### Opción C: Patrón outbox en Postgres (elegida)

En **la misma transacción** que cambia el estado del pago se inserta una fila en `events`. Si una falla, fallan las dos. El worker envía los eventos pendientes después.

```sql
BEGIN;
UPDATE payment_intents SET status = 'succeeded' ... WHERE id = $1 AND status = 'processing';
INSERT INTO events (id, merchant_id, type, data) VALUES ('evt_...', $2, 'payment_intent.succeeded', $3);
COMMIT;
```

## Diseño

**Tabla `events`** (hace de outbox y de historial):

| Columna | Nota |
|---|---|
| `id` | `evt_...` |
| `merchant_id`, `livemode`, `type`, `data jsonb`, `created_at` | |
| `delivery_status` | `pending` · `delivered` · `failed` |
| `attempts`, `next_attempt_at`, `last_error` | |

Una fila por evento, no por entrega: con un solo endpoint por comercio en esta versión es suficiente (ponytail: si se admiten varios endpoints, se separa una tabla `webhook_deliveries`).

**Tipos de evento de la primera versión:** `payment_intent.succeeded`, `payment_intent.failed`, `payment_intent.canceled`, `payment_intent.expired`.

**Envío (worker):**

```sql
SELECT * FROM events
WHERE delivery_status = 'pending' AND next_attempt_at <= now()
ORDER BY created_at
LIMIT 20
FOR UPDATE SKIP LOCKED;
```

`SKIP LOCKED` permite arrancar varios workers sin que dos envíen el mismo evento.

**Reintentos:** respuesta 2xx = entregado. Si no, backoff exponencial (1 min, 5 min, 30 min, 2 h, 12 h…) hasta ~8 intentos; después, `failed`, visible en el dashboard con un botón de reenviar. Timeout de 10 s por petición.

**Garantía:** *al menos una vez*. El comercio puede recibir un evento repetido y debe deduplicar por `event.id`, como con Stripe. Se dice así en la documentación.

**Firma**, con el mismo formato que Stripe:

```
Instanta-Signature: t=1790000000,v1=<hex(HMAC-SHA256(secret, t + "." + body))>
```

- `secret` (`whsec_...`) generado al crear el endpoint y mostrado al comercio.
- La marca de tiempo va dentro de lo firmado: el comercio rechaza firmas de hace más de 5 minutos (evita reenvíos de un mensaje capturado).
- La documentación incluye el código de verificación del lado del comercio (unas 10 líneas con `node:crypto` y `timingSafeEqual`).

## Consecuencias

- Se añade un servicio saliente: las URLs de webhook se validan (solo `https` en live) para no convertir el servidor en un proxy hacia la red interna de la VM (SSRF).
- No hay Redis. Si el volumen crece mucho, la cola se puede extraer después; la interfaz (una tabla de eventos) no cambia.

## Decisión

Outbox en Postgres (`events`), envío desde el worker con `FOR UPDATE SKIP LOCKED`, reintentos con backoff, entrega al menos una vez y firma HMAC-SHA256 con marca de tiempo.
