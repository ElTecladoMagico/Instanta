# ADR-015: Pagos en ETH desde cuentas inteligentes — transferencias internas con Blockscout

**Fecha:** 1 de octubre de 2026  
**Estado:** Aceptada  
**Contexto:** La primera prueba E2E con MetaMask falló como `wrong_recipient` aunque el ETH sí llegó; modifica ADR-008 y ADR-013

---

## Problema

ADR-013 verificaba los pagos en ETH mirando dos campos de la transacción: `to` (destinatario) y `value` (importe). Dejó documentada una limitación: *"si el ETH llega a través de un contrato (una transferencia interna) no aparece en `tx.to`/`tx.value`"*. Se consideró un caso raro.

En la primera prueba real resultó ser **el comportamiento por defecto de MetaMask**:

| Campo | Lo que se esperaba | Lo que llegó |
|---|---|---|
| Tipo | `0x0`/`0x2` (transferencia normal) | `0x4` (**EIP-7702**: la cuenta del usuario delega en un contrato y actúa como cuenta inteligente) |
| `from` | La cartera del comprador | `0xb01c…`, un *relayer* de MetaMask que paga el gas |
| `to` | La cartera del comercio | `0xdb9b…`, un contrato |
| `value` | 0,0001 ETH | **0** |

Los 0,0001 ETH se movieron dentro de la transacción, en una **llamada interna** de la cuenta del comprador a la del comercio. `verify()` vio "0 ETH a otro destinatario" y marcó el pago como `wrong_recipient`. El dinero sí había llegado.

Los pagos en **USDC no tienen este problema**: el contrato del token emite el evento `Transfer` venga de donde venga la llamada, y `verify()` lee los eventos (ADR-008).

## Opciones evaluadas

### Opción A: Trazar la transacción con el nodo (`debug_traceTransaction`) (descartada)

Es la forma estándar de ver las llamadas internas. Se comprobó: los nodos públicos gratuitos de Base Sepolia la bloquean (`sepolia.base.org`: *rejected due to request filter settings*; publicnode: *method does not exist*), y el plan gratuito de Alchemy no incluye la API de depuración ni la de trazas.

### Opción B: Comparar el saldo del comercio antes y después del bloque (descartada)

Funciona con cualquier nodo, pero falla si llegan dos pagos al mismo comercio en el mismo bloque, o si el comprador es el propio comercio (el saldo no cambia). Justo la prueba E2E era un autopago.

### Opción C: Admitir ETH solo desde carteras estándar (descartada)

Cero código, pero el ETH no funcionaría con MetaMask tal cual viene configurado.

### Opción D: Transferencias internas según Blockscout (elegida)

[Blockscout](https://www.blockscout.com/) es un explorador de bloques **de código abierto** que indexa las transferencias internas de cada transacción y las expone en una API pública y gratuita, sin clave:

```
GET https://base-sepolia.blockscout.com/api/v2/transactions/{hash}/internal-transactions
```

Con la transacción de la prueba devolvió exactamente el pago: `call 0xAE76… → 0xAE76… value 100000000000000 success true`.

## Diseño

- **`lib/blockscout.ts`**: `internalTransfers(url, hash)` recorre las páginas de la API y normaliza cada transferencia a `{ type, to, value, success }`.
- **`verify()`** (sigue siendo pura): para ETH, lo recibido es `tx.value` si `tx.to` es el comercio, **más** la suma de las llamadas internas de tipo `call`, con éxito, hacia el comercio. Un `delegatecall` no cuenta (no mueve ETH a otra cuenta), ni una llamada que falló.
- **`settle.ts`**: solo consulta Blockscout cuando la moneda es ETH y `tx.to` no es el comercio. El caso normal no depende de un tercero.
- **Margen de indexación:** Blockscout indexa las transferencias internas con algo de retraso y su API no indica si ya terminó. Si se consultaron y el pago no aparece, el pago **sigue en `processing`** hasta que el bloque tenga **10 minutos**; solo entonces se da por fallido.
- Si Blockscout no responde, el pago sigue en `processing` y se vuelve a comprobar en la siguiente consulta.
- URL por red en `lib/chains.ts` (`base-sepolia.blockscout.com` y `base.blockscout.com`), configurable por variable de entorno.

## Consecuencias

- Los pagos en ETH funcionan con carteras estándar **y** con cuentas inteligentes (EIP-7702, Safe, Coinbase Smart Wallet…).
- **Dependencia de un tercero** solo para ese caso. Al ser código abierto, se podría alojar un Blockscout propio. Queda documentado como limitación y trabajo futuro.
- En el peor caso, un pago en ETH inválido desde una cuenta inteligente tarda 10 minutos en marcarse como fallido.
- Tests: la transacción real de la prueba se guardó como fixture (`eth-7702.json`) con sus 12 transferencias internas.

## Lección para el TFG

Una limitación documentada como "rara" resultó ser el caso por defecto de la cartera más usada. Las pruebas E2E con carteras reales son imprescindibles: los fixtures solo cubren lo que uno ya sabe que existe.

## Decisión

Para pagos en ETH cuyo destinatario directo no es el comercio, sumar las transferencias internas exitosas hacia el comercio según la API pública de Blockscout, con un margen de 10 minutos antes de dar el pago por fallido.
