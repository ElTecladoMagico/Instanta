# 11 · Eventos, webhooks y worker

**Fecha:** 01/10/2026 · **Fase del calendario:** 7 · **Decisión:** [ADR-009](../decisions/009-webhooks-outbox.md)

## Qué se hizo

El servidor del comercio ya no necesita preguntar por sus pagos: **Instanta le avisa** con una petición HTTP firmada (un *webhook*) cuando un pago se completa, falla, se cancela o caduca. Y un proceso en segundo plano (**worker**) hace el trabajo que no depende de que alguien llame a la API.

| Rama | Qué añade | Tests |
|---|---|---|
| `feat/events` | Patrón *outbox*: un evento por cada transición final, en la misma transacción de la BD | 8 |
| `feat/webhook-endpoints` | Protección SSRF, `/v1/webhook_endpoints` y `/v1/events` | 6 + 10 + 5 + 1 |
| `feat/webhook-delivery` | Firma HMAC, entrega con reintentos, reserva de eventos sin colas externas | 11 |
| `feat/worker` | Migración `0002` (`submitted_at`), `tx_not_found` tras 1 h, `runOnce()` y el proceso `worker` | 1 + 3 + 3 |

## Cómo funciona un webhook en Instanta

```
 pago cambia de estado ──┐
                         │  misma transacción de la BD (sql.begin)
                         ▼
   UPDATE payment_intents … ;  INSERT INTO events (delivery_status = 'pending')
                         │
                         ▼   cada 5 s
   worker: deliverPendingEvents()
     1. reserva eventos pendientes (UPDATE … FOR UPDATE SKIP LOCKED, 2 min de reserva)
     2. busca el endpoint del comercio (sin endpoint → failed)
     3. comprueba que la URL es pública (SSRF)
     4. POST JSON + cabecera Instanta-Signature: t=<unix>,v1=<HMAC-SHA256>
     5. 2xx → delivered · otro → reintento (1 min, 5 min, 30 min, 2 h, 12 h…) · 8 fallos → failed
                         │
                         ▼
   servidor del comercio: verifica la firma, ignora event.id repetidos, marca el pedido como pagado, responde 200
```

## Decisiones de diseño y por qué

| Decisión | Por qué |
|---|---|
| **Outbox en Postgres**: el evento se inserta en la misma transacción que el cambio de estado | Si el servidor cae justo después de confirmar un pago, el aviso no se pierde: o están los dos, o ninguno. Probado: dos procesos verificando el mismo pago a la vez generan **un** evento |
| **Postgres como cola** (`FOR UPDATE SKIP LOCKED` + reserva de 2 min) | Sin Redis ni librería de colas. Varios workers no envían el mismo aviso, y si uno se cae a mitad, la reserva vence y otro lo reintenta |
| **Entrega "al menos una vez"** | Es lo que se puede garantizar con reintentos. El comercio debe ignorar `event.id` repetidos (igual que con Stripe) |
| **Firma `t=…,v1=HMAC-SHA256(secreto, t + "." + cuerpo)`** | Formato de Stripe. La marca de tiempo va dentro de lo firmado: un aviso capturado no se puede reenviar pasados 5 minutos. La comprobación usa `timingSafeEqual` |
| **El secreto `whsec_…` se guarda en claro** | A diferencia de las API keys, hace falta para firmar. Se muestra una sola vez |
| **SSRF: nunca a direcciones privadas** (`node:net` `BlockList` + resolución DNS), **al registrar y al enviar**, y **sin seguir redirecciones** | Sin esto, un comercio podría usar Instanta para hacer peticiones a la red interna de la VPS (`127.0.0.1`, `postgres`, `169.254.169.254`…) |
| **Sin endpoint → `failed` con el motivo** | El evento queda en el historial (`/v1/events`) aunque no se envíe |
| **`tx_not_found` una hora después del `submit`** (columna `submitted_at`, migración `0002`) | Una transacción que el nodo sigue sin conocer una hora después no se va a minar. Primera migración nueva con Alembic, con su `downgrade` probado |
| **Worker = un bucle de 5 s sobre `runOnce()`** | `runOnce()` solo encadena piezas que ya tienen tests (caducar, `checkPayment`, `deliverPendingEvents`). Cada paso es independiente: si el nodo falla, los avisos se siguen enviando |
| **Tests de uno en uno** (`--test-concurrency=1`) | Comparten la BD y el worker actúa sobre todos los pagos y eventos pendientes |

## Problemas encontrados

| Problema | Causa | Solución |
|---|---|---|
| Los tests de entrega fallaban la primera vez y pasaban la segunda | La BD local tenía cientos de eventos pendientes de ejecuciones anteriores; el envío toma los 20 más antiguos y nunca llegaba al del test | Cada test retira antes los pendientes ajenos: ya no depende del contenido de la BD |
| La imagen del worker no se construía en el Mac | El Mac es ARM; una dependencia de wagmi (`utf-8-validate`) no tiene binario para `linux/arm64` e intenta compilarse sin Python | No afecta a la VPS (x86-64, con binario precompilado). Se probó el worker en local con `npm run worker` |

## Prueba en producción

Se dejó vencido a propósito un pago en la BD de la VPS. Sin que nadie consultara la API, en menos de 12 s el worker lo pasó a `expired`, generó `payment_intent.expired` e intentó el aviso; como el comercio de pruebas no tiene endpoint, el evento quedó `failed` con `No webhook endpoint configured`. La migración `0002` se aplicó sola al desplegar.

## Evidencia TDD

| Pieza | RED | GREEN |
|---|---|---|
| Eventos (outbox) | `Cannot find module lib/events.ts` | 8/8 |
| SSRF | `Cannot find module lib/ssrf.ts` | 6/6 |
| Endpoints de webhooks | No existen las rutas | 9/9, y +2 (error de BD propagado, cuerpo no JSON) |
| API de eventos | No existen las rutas | 5/5 |
| Entrega de webhooks | `Cannot find module lib/webhooks.ts` | 11/11 |
| Migración `0002` | Falla el test de la columna | 4/4 en pytest |
| `submitted_at` y `tx_not_found` | 2 fallos | 34/34 (checkout + settle) |
| Worker | `Cannot find module lib/worker.ts` | 3/3, incluido el recorrido completo: pago en `processing` → verificado → aviso firmado recibido por el servidor del comercio |

**Suite completa: 176 tests (Node) + 4 (pytest), 100 % de líneas, ramas y funciones** en `lib/` y `/v1`.

## Pendiente

- Probar un webhook real contra un servidor del comercio en internet: llega con la tienda de ejemplo (fase 8, ADR-012).
- Reenviar a mano un evento fallido (botón en el dashboard, fase 8).
- La comprobación SSRF y la petición resuelven el DNS por separado (un ataque de *DNS rebinding* podría colarse entre ambas). Se documenta como limitación.
