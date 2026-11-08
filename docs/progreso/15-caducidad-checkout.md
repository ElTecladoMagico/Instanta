# 15 · No empezar a pagar con menos de 5 min y no perder el hash pendiente

**Fecha:** 08/11/2026 · **Decisión:** [ADR-007](../decisions/007-dinero-y-maquina-de-estados.md) (caducidad) y [ADR-010](../decisions/010-checkout-y-boton-embebible.md) · **Rama:** `fix/checkout-expiry`

## Qué se hizo

Revisando la caducidad apareció un caso en el que el comprador paga y el pago no consta:
1. El comprador abre el checkout cuando al pago le queda poco para caducar.
2. Firma, envía la transacción y la cartera tarda en devolver el hash.
3. Cuando el navegador manda el hash, el pago ya está en `expired` y `submit` lo rechaza. Los fondos ya están en la cartera del comercio.

**El arreglo, en dos partes:**
- **Servidor.** `POST /v1/checkout/{secret}/payer`, el primer paso del pago, responde `409 payment_expiring` si quedan menos de 5 minutos (`MIN_TIME_TO_PAY_MS` en `lib/checkout.ts`). Así nadie empieza a pagar sin margen.
- **Navegador** (`PayFlow.tsx`):
  - el hash pendiente de enviar se guarda también en `localStorage`, para no perderlo si el comprador recarga la página;
  - solo se borra cuando el servidor ya tiene la transacción (`tx_hash`), no cuando el pago deja de estar en `requires_payment`;
  - si el pago caducó con un hash pendiente, la página muestra el enlace de la transacción en el explorador para que el comprador se lo envíe al comercio.

## Por qué

- Firmar, enviar la transacción y mandar el hash lleva segundos; 5 minutos dejan margen de sobra para que el pago no caduque entre medias.
- Es el mismo valor que el mínimo de `expires_in` al crear un pago (300 s, `CreateParams` en `lib/payment-intents.ts`).
- La parte del navegador cubre lo que el servidor no puede saber: que el comprador ya pagó aunque el hash no haya llegado.

## Cómo (ciclos TDD)

| # | Qué se garantiza | Test | RED | GREEN |
|---|---|---|---|---|
| 1 | Con menos de 5 min hasta caducar no se registra el pagador (`409 payment_expiring`); con 6 min sí | `test/checkout.test.ts` ("Caducidad al empezar a pagar") | `2f78d23`: devuelve 200 | `5f6b814`: 205/205 |
| 2 | El hash pendiente sobrevive a una recarga y se conserva si el pago caducó sin recibirlo | — (componente de navegador sin tests automáticos) | — | `1c8c5ed`, `d5b29dd` |
| 3 | Si el pago caducó tras pagar, se muestra el enlace de la transacción para reclamarla | — (ídem) | — | `2601c35` |

**Commits:**
- `2f78d23`, `5f6b814`, `1c8c5ed` y `d5b29dd` en la rama, mergeada con `f285161`.
- `2601c35` se hizo después del merge, directamente en main.

## Problemas encontrados

- Los cambios de `PayFlow.tsx` no tienen test automático: la página de pago solo se prueba a mano con una cartera real (ADR-011, prueba manual/E2E).
- Queda un caso sin cubrir: si el comprador borra los datos del navegador antes de mandar el hash, el enlace se pierde. Tendría que encontrar la transacción en su cartera.
