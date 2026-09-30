# 07 · Verificación on-chain: `verify()`

**Fecha:** 30/09/2026 · **Fase del calendario:** 4 · **Decisiones:** [ADR-008](../decisions/008-verificacion-on-chain.md), [ADR-013](../decisions/013-eth-nativo-en-testnet.md)

## Qué se hizo

Se implementó el núcleo del producto: la función que decide si una transacción de la blockchain paga un pago concreto. Con TDD y sobre **transacciones reales** de Base Sepolia.

| Pieza | Archivo | Qué hace |
|---|---|---|
| Cliente RPC | `lib/rpc.ts` | Una llamada JSON-RPC al nodo: un `POST` con JSON, 12 líneas, sin librerías |
| Captura de fixtures | `scripts/capture-tx.ts` | Guarda la transacción, su recibo y la hora del bloque tal como las da el nodo |
| Verificación | `lib/verify.ts` | Función pura: recibe el pago esperado y la transacción; devuelve `succeeded`, `processing` o `failed` con un código |

## Por qué una función pura

`verify()` no hace llamadas de red ni a la base de datos: recibe datos y devuelve un veredicto. Así:

- Se prueba con datos guardados, sin depender de la red ni de mocks.
- Se lee de arriba abajo como la lista de reglas del ADR.
- La parte con efectos (pedir el recibo al nodo, guardar el resultado) irá aparte, en el worker, y será muy fina.

## Las reglas, en orden

1. **La transacción tuvo éxito** (`receipt.status = 0x1`). Si no → `reverted`.
2. **Cuánto le llegó al comercio**, según la moneda:
   - **ETH:** la transacción va dirigida al comercio (`to`) y lleva el importe en `value`.
   - **USDC:** se buscan en el recibo los eventos `Transfer` (identificados por su *topic* `keccak256("Transfer(address,address,uint256)")`) cuyo destinatario (`topics[2]`) es el comercio y cuyo emisor es el contrato de USDC, y se suman sus importes (`data`).
   - Si no llega nada al comercio → `wrong_recipient`; si llega un `Transfer` de otro contrato (un token falso) → `wrong_token`.
3. **Importe suficiente**. Si falta → `amount_mismatch`; pagar de más se acepta y se registra.
4. **La transacción no es anterior al pago**. Si lo es → `tx_too_old` (evita reutilizar un pago antiguo, amenaza T4).
5. **Confirmaciones suficientes**. Si faltan → `processing` (se vuelve a comprobar más tarde).

La decodificación de los eventos se hace a mano, en pocas líneas, porque es lo que explica la sección 2.3 del marco teórico: un evento es una dirección de contrato, una lista de *topics* y unos datos.

## Los datos de prueba (reales)

No hizo falta hacer pagos propios: la blockchain es pública. Se buscaron con el RPC transacciones recientes de Base Sepolia y se guardaron en `test/fixtures/`:

| Fixture | Qué es |
|---|---|
| `usdc-transfer.json` | Un pago de 0,001 USDC hecho con `transferWithAuthorization`. **Emite dos eventos** del contrato de USDC: `AuthorizationUsed` y `Transfer` |
| `eth-transfer.json` | Una transferencia directa de 0,00001 ETH |
| `reverted.json` | Una transacción que falló |

El primer fixture resultó especialmente útil: el evento `AuthorizationUsed` también lleva una dirección en `topics[2]`. Una implementación que no comprobara el tipo de evento la tomaría por el destinatario del pago. Hay un test específico para eso.

## Evidencia TDD

| Paso | Comando | Resultado |
|---|---|---|
| RED (rpc) | `node --test test/rpc.test.ts` | Falla: `Cannot find module lib/rpc.ts` |
| GREEN (rpc) | mismo | 3 de 3 |
| RED (verify) | `node --test test/verify.test.ts` | Falla: `Cannot find module lib/verify.ts` |
| GREEN (verify) | mismo | 16 de 16 |
| Suite completa | `npm run test:coverage` | 42 de 42; 100 % de líneas, ramas y funciones en `db`, `ids`, `rpc`, `verify` y `health` |

## Qué garantizan los tests de `verify()`

| # | Caso | Resultado esperado |
|---|---|---|
| 1 | USDC, importe exacto, contrato y destinatario correctos | `succeeded`, 1000 |
| 2 | USDC, paga de más | `succeeded`, registra 1000 |
| 3 | USDC, paga de menos | `failed amount_mismatch` |
| 4 | USDC, pago a otra dirección | `failed wrong_recipient` |
| 5 | La dirección de `AuthorizationUsed` no cuenta como destinatario | `failed` |
| 6 | `Transfer` al comercio desde otro contrato (token falso) | `failed wrong_token` |
| 7 | Direcciones con mayúsculas de checksum (EIP-55) | se comparan igual |
| 8 | Transacción de ETH para un pago en USDC | `failed` |
| 9–12 | ETH: exacto, de menos, otra dirección, llamada a un contrato con `value` 0 | `succeeded` / `amount_mismatch` / `wrong_recipient` / `failed` |
| 13 | Transacción revertida | `failed reverted` |
| 14 | Transacción anterior al pago | `failed tx_too_old` |
| 15–16 | Menos confirmaciones de las exigidas / justo las exigidas | `processing` / `succeeded` |

## Cambios respecto al ADR-008

- El ADR preveía usar viem para hablar con el nodo. No hizo falta: JSON-RPC es un `POST` con JSON y `fetch` ya viene con Node. viem sigue usándose en el navegador para conectar la cartera.
- Se añadió la comprobación de que un `Transfer` tiene exactamente 3 *topics*: el `Transfer` de los NFT (ERC-721) tiene la misma firma pero 4, y su `data` está vacío.

## Qué falta (siguientes fases)

La parte con efectos: pedir al nodo el recibo y el número de bloque actual (para calcular confirmaciones), llamar a `verify()` y guardar el resultado con la transición de estado de ADR-007. Llegará con la API de pagos (fase 5) y el worker.

## Commits

- test(rpc) RED · feat(rpc) GREEN
- test(fixtures): capture real Base Sepolia transactions
- test(verify) RED · feat(verify) GREEN
