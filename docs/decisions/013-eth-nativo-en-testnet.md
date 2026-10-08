# ADR-013: Admitir ETH nativo además de USDC

**Fecha:** 30 de septiembre de 2026  
**Estado:** Aceptada (30/09/2026: `NUMERIC(78,0)`, `token_address` nulo para ETH y rama ETH en `verify()`). La limitación de transferencias internas se resolvió en [ADR-015](015-eth-desde-cuentas-inteligentes.md)  
**Contexto:** Para probar en testnet hace falta poder cobrar en ETH, como hacía el prototipo; modifica ADR-007 y ADR-008

---

## Problema

Los ADR anteriores solo contemplan USDC. Pero para las pruebas en Base Sepolia es más cómodo pagar con ETH de testnet, que es lo que usaba el prototipo (`sendTransaction` con `parseEther`) y lo que dan todos los *faucets*. Si el diseño solo admite USDC, cada prueba exige conseguir USDC de test.

Además, ETH y USDC se mueven de forma distinta en la cadena, y eso afecta a dos decisiones ya tomadas:

| | USDC (token ERC-20) | ETH (moneda nativa) |
|---|---|---|
| Cómo se envía | Llamada `transfer(to, amount)` al contrato del token | Transacción con `to` y `value` |
| Dónde se ve el pago | Evento `Transfer` en los *logs* del recibo | Campos `to` y `value` de la propia transacción |
| Decimales | 6 | 18 (1 ETH = 10¹⁸ wei) |

## Opciones Evaluadas

### Opción A: Solo USDC; para probar, conseguir USDC de test (descartada)

Cada prueba depende de un *faucet* concreto de Circle, y se pierde lo que el prototipo ya hacía.

### Opción B: Solo ETH en test y solo USDC en live (descartada)

Lo que se prueba no es lo que se usaría en producción: la verificación de tokens nunca se ejercitaría en testnet.

### Opción C: `currency` admite `usdc` y `eth` en ambos modos (elegida)

El comercio elige la moneda al crear el pago. En testnet se puede probar cualquiera de las dos, y la verificación de ambas queda cubierta por tests.

## Cambios que implica

**Importes (modifica ADR-007).** Con 18 decimales, un `BIGINT` solo llega a ~9,2 ETH. Se pasa a `NUMERIC(78,0)`, que admite cualquier `uint256` (el tipo de los importes en Ethereum). En TypeScript sigue siendo `bigint` y en JSON, string. Es el cambio que ADR-007 ya preveía "si se añaden tokens de 18 decimales".

**Esquema.**
- `currency IN ('usdc', 'eth')` en `payment_intents` y `payment_links`.
- `token_address` pasa a ser opcional: `NULL` para ETH. Una restricción lo garantiza: `(currency = 'eth') = (token_address IS NULL)`.

**Verificación (modifica ADR-008).** `verify()` tiene dos ramas, según la moneda:

- **USDC:** sin cambios (log `Transfer` del contrato correcto hacia `pay_to` con `value >= amount`).
- **ETH:** `receipt.status === "success"`, `tx.to = pay_to` y `tx.value >= amount`. La capa de I/O pide además la transacción (`getTransaction`), porque el recibo no incluye `value`.

Las reglas de antigüedad del bloque, confirmaciones y `UNIQUE(tx_hash)` son las mismas para las dos.

**Checkout (ADR-010).** Si la moneda es ETH, `sendTransaction({ to, value })`; si es USDC, `writeContract` con `transfer`.

## Limitación

> **Actualización (01/10/2026):** esta limitación resultó ser el comportamiento por defecto de MetaMask (cuentas EIP-7702). Se resolvió en [ADR-015](015-eth-desde-cuentas-inteligentes.md).

Con ETH solo se detectan **transferencias directas** desde la cartera del comprador. Si el ETH llegara a través de un contrato (una *internal transaction*), no aparece en `tx.to`/`tx.value` y el pago se marcaría como fallido. El checkout siempre hace transferencias directas, así que no afecta al flujo normal; se documenta como limitación.

## Decisión

Admitir `currency: "eth"` junto a `"usdc"`, con importes en `NUMERIC(78,0)`, `token_address` nulo para ETH y una rama de verificación por moneda.
