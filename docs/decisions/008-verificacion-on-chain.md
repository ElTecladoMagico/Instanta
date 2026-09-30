# ADR-008: Verificación on-chain — función pura sobre el recibo, asociación por `tx_hash`

**Fecha:** 30 de septiembre de 2026  
**Estado:** Propuesta  
**Contexto:** Es el núcleo del producto: decidir, sin custodiar fondos, si un pago se ha hecho de verdad

---

## Problema

Instanta no custodia fondos: el comprador paga directamente a la cartera del comercio. Así que el sistema no "recibe" el dinero; tiene que **observar la blockchain y demostrar** que una transacción concreta paga un intent concreto. Hoy esto se hace mirando solo si la transacción tuvo éxito (ADR-004, T1–T4).

Hay dos subproblemas: **asociar** una transacción a un pago y **verificarla**.

## Asociación transacción ↔ pago

Una transferencia ERC-20 no lleva campo de concepto, así que la cadena no dice a qué pago corresponde.

### Opción A: Escanear los eventos `Transfer` hacia la cartera del comercio y casar por importe (descartada por ahora)

Detecta pagos hechos fuera del widget, pero es ambiguo si hay dos pagos abiertos con el mismo importe hacia el mismo comercio.

### Opción B: Dirección de depósito única por pago con CREATE2 (descartada por ahora)

Es lo que hace Coinbase Commerce y elimina la ambigüedad, pero exige desplegar contratos y barrer fondos. Queda como trabajo futuro.

### Opción C: El checkout envía el `tx_hash` y la BD impide reutilizarlo (elegida)

El widget conoce el hash en cuanto el comprador firma, lo envía con `POST /v1/checkout/:client_secret/submit`, y `UNIQUE(tx_hash)` garantiza que una transacción paga como mucho un intent.

**Limitación documentada:** si el comprador paga fuera del checkout (copiando la dirección), el pago no se asocia solo.

## Verificación

### Diseño: núcleo puro, capa de I/O fina

```ts
// sin red, sin BD: fácil de probar y de explicar
verify(receipt, block, intent, confirmations) →
  { ok: true, amountReceived } | { ok: false, reason }
```

La capa de I/O obtiene el recibo y el bloque con viem (`getTransactionReceipt`, `getBlock`) y llama a `verify`. Los tests usan recibos reales de Base Sepolia guardados en JSON, sin mocks ni red.

**Reglas, en orden:**

1. `receipt.status === "success"` → si no, `failed: reverted`.
2. Entre los `logs`, los que cumplen **a la vez**:
   - `address` = `intent.token_address` (el contrato USDC real; un token falso puede emitir un `Transfer` idéntico)
   - `topics[0]` = `keccak256("Transfer(address,address,uint256)")`
   - `to` decodificado = `intent.pay_to`
3. Suma de `value` de esos logs `>= intent.amount` → si no, `failed: amount_mismatch`. Se guarda lo recibido en `amount_received` (si paga de más, se registra).
4. `block.timestamp >= intent.created_at` → si no, `failed: tx_too_old`.
5. `confirmaciones >= N` → si no, sigue en `processing`.

La decodificación del evento se hace a mano (`topics[2]` es el destinatario con relleno, `data` es el importe). Es corta y conecta con la sección 2.3 del marco teórico. viem se usa para hablar con el RPC, no para decodificar.

## Cuándo se verifica

- **Al recibir el `submit`:** verificación inmediata. Si aún no hay recibo o faltan confirmaciones, queda en `processing`.
- **En el worker:** cada pocos segundos recorre los pagos en `processing` (`SELECT ... FOR UPDATE SKIP LOCKED`), sin depender de que alguien tenga el checkout abierto.
- **Al consultar** `GET /v1/payment_intents/:id` en `processing`: una verificación oportunista.

Ya no hay un cron que recorra todos los pagos cada 5 s.

## Finalidad en Base

Base es una L2: un bloque confirmado por el secuenciador aún no es final en Ethereum (L1). Se decide:

- N configurable por modo (`CONFIRMATIONS_TEST`, `CONFIRMATIONS_LIVE`), con valores bajos en test.
- `succeeded` significa "N confirmaciones en L2"; la finalidad en L1 llega más tarde.
- El riesgo de reorganización se documenta (ADR-004, T10), no se elimina.

## Otras decisiones

- **RPC:** una URL por variable de entorno (Alchemy). Si da problemas, `fallback()` de viem con varios proveedores.
- **Envío del pago:** el widget pasa de `sendTransaction` con ETH a `writeContract` con `transfer(pay_to, amount)` del contrato USDC.

## Decisión

Asociar por `tx_hash` enviado desde el checkout con `UNIQUE(tx_hash)`. Verificar con una función pura sobre el recibo que comprueba éxito, contrato del token, destinatario, importe, antigüedad y confirmaciones.
