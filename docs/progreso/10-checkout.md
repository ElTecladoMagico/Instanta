# 10 · Checkout, payment links y primeras pruebas E2E con pagos reales

**Fechas:** 30/09–01/10/2026 · **Fase del calendario:** 6 · **Decisiones:** [ADR-008](../decisions/008-verificacion-on-chain.md), [ADR-010](../decisions/010-checkout-y-boton-embebible.md), [ADR-015](../decisions/015-eth-desde-cuentas-inteligentes.md)

## Qué se hizo

El recorrido completo del comprador: abrir el enlace de pago, pagar con su cartera y ver el pago confirmado, verificado en la blockchain. Y el botón embebible para comercios sin backend. Se cerró con **dos pagos reales** en Base Sepolia desde MetaMask (ETH y USDC), que destaparon dos problemas que los tests no podían prever.

| Rama | Qué añade | Tests |
|---|---|---|
| `feat/settle` | `lib/settle.ts`: pide al nodo transacción, recibo, bloque y bloque actual; calcula confirmaciones; llama a `verify()` y guarda el resultado con la transición condicional | 11 |
| `feat/checkout-api` | `GET /v1/checkout/:client_secret` y `POST …/submit` (públicas, con el `client_secret`). El `GET` del comercio también comprueba el pago | 16 |
| `feat/payment-links` | `POST /v1/payment_links/:id/checkout` (público, CORS `*`) y el nuevo `button.js` | 6 |
| `feat/checkout-page` | Página `/pay/:client_secret` con wagmi; `Referrer-Policy: no-referrer` | 3 + E2E manual |
| `feat/eth-internal-transfers` | ETH desde cuentas inteligentes vía Blockscout (ADR-015) | 12 |
| `fix/settle-missing-block` | Dos fallos encontrados en la prueba E2E de USDC | 1 + fixtures E2E |

## Cómo funciona el flujo completo

```
Comercio (API)                 Comprador (navegador)                     Instanta                          Base Sepolia
POST /v1/payment_intents ──▶  checkout_url
                              GET /pay/pi_…_secret_…  ──────────────▶  página (wagmi)
                              GET /v1/checkout/…      ──────────────▶  datos públicos del pago
                              cartera: transfer / sendTransaction ─────────────────────────────────────▶ transacción
                              POST /v1/checkout/…/submit {tx_hash} ─▶  requires_payment → processing
                                                                        checkPayment(): rpc + verify() ─▶ recibo, bloque, confirmaciones
                              GET cada 3 s ──────────────────────────▶ checkPayment() hasta succeeded/failed
GET /v1/payment_intents/:id ─────────────────────────────────────────▶ también comprueba si está en processing
```

Con el botón embebible, el primer paso lo da `button.js`: `POST /v1/payment_links/pl_…/checkout` crea el pago en el servidor con el importe y la cartera del enlace guardado, y abre el `checkout_url` en un iframe.

## Decisiones tomadas en esta fase

| Decisión | Por qué |
|---|---|
| **Verificar al consultar**, sin proceso en segundo plano todavía | La página consulta cada 3 s y el comercio puede consultar cuando quiera; cada consulta de un pago en `processing` lo comprueba en la cadena. El *worker* (fase 7) hará lo mismo sin depender de que alguien consulte |
| **2 confirmaciones en test, 10 en live** | Base produce un bloque cada ~2 s: unos 4 s y 20 s de espera |
| **Si el nodo falla o la transacción no está aún en un bloque → `processing`** | Nunca se marca un pago como fallido por un problema de infraestructura |
| **`tx_hash` en minúsculas** al guardarlo | Para que el `UNIQUE` funcione aunque el hash llegue con otras mayúsculas |
| **El 404 del checkout no repite el `client_secret`** | Es un secreto y no debe acabar en logs |
| **CORS `*` solo en el endpoint del botón** | `button.js` corre en la web del comercio (otro dominio); el endpoint no usa cookies ni devuelve datos privados |
| **La página no tiene lógica de negocio** | Todo lo que decide está en el servidor y tiene tests; la página solo orquesta la cartera |

## Pruebas E2E con pagos reales

Se creó en producción un comercio de pruebas con la cartera del autor como cartera de cobro y se pagó desde MetaMask.

### Preparación: conseguir fondos de prueba

- Las testnets necesitan su propio "dinero" de prueba. La dirección de una cartera es la misma en todas las redes compatibles con Ethereum, pero **cada red tiene su propio saldo**.
- Se consiguió ETH de **Ethereum Sepolia** con un grifo de prueba de trabajo (*proof of work*) y se pasó a **Base Sepolia** con el **puente oficial de Base**: enviando ETH al contrato `L1StandardBridge` (`0xfd0Bf71F…3120`, verificado en la documentación de Base), que lo acredita a la misma dirección en Base Sepolia.
- El USDC de prueba sale del grifo de Circle. La primera vez se pidió por error en Ethereum Sepolia, lo que confirmó en la práctica lo de "cada red tiene su saldo".

### Hallazgo 1: MetaMask paga desde una "cuenta inteligente" (EIP-7702)

El primer pago en ETH se marcó como `failed / wrong_recipient` **aunque el ETH sí llegó**. La transacción no era una transferencia normal: era de tipo `0x4` (EIP-7702), la envió un *relayer* de MetaMask, iba dirigida a un contrato y tenía `value` 0. El ETH se movió en una **llamada interna**. La limitación estaba prevista como "rara" en ADR-013 y resultó ser el comportamiento por defecto de MetaMask. Solución en [ADR-015](../decisions/015-eth-desde-cuentas-inteligentes.md): las transferencias internas se consultan en la API pública de **Blockscout**, porque los nodos gratuitos no permiten trazar transacciones.

Los pagos en USDC no tienen este problema: el contrato del token emite su evento `Transfer` venga de donde venga la llamada.

### Hallazgo 2: el nodo público a veces no tiene todavía el bloque

En el pago de USDC, la página mostró `Unexpected end of JSON input`. El servidor había devuelto un `500` sin cuerpo:

- **Causa:** `sepolia.base.org` reparte las peticiones entre varios servidores. Uno devolvió el recibo y otro, que iba un bloque por detrás, devolvió `null` al pedir el bloque. `settle.ts` no lo contemplaba.
- **Arreglo (TDD):** el nodo falso de los tests puede ahora "ocultar" un bloque; con eso el test reprodujo el `TypeError`, y el arreglo deja el pago en `processing` hasta que el bloque aparece.
- **Arreglo en la página:** si la respuesta del `submit` falla pero el servidor ya guardó la transacción, la página lo detecta consultando el estado y continúa (antes ofrecía reintentar, lo que habría dado `409`).

El pago **no se perdió**: la transacción estaba guardada en `processing` y la siguiente consulta lo completó.

### Resultado

| Pago | Transacción | Resultado |
|---|---|---|
| 0,0001 ETH (primer intento) | `0xcc00…5d21` (tipo `0x4`) | `failed` antes de ADR-015; con ADR-015 se acepta (fixture `eth-7702`) |
| 0,0001 ETH | `0x8d50…0bfe` | **`succeeded`**, vía transferencia interna |
| 0,01 USDC | `0xb49a…9b98` | **`succeeded`**, vía evento `Transfer` (tras el arreglo del bloque) |

Las tres transacciones reales se guardaron como fixtures (`eth-7702`, `e2e-eth`, `e2e-usdc`) y tienen su test: quedan como pruebas de regresión permanentes.

## Evidencia TDD

| Pieza | RED | GREEN |
|---|---|---|
| `settle` | `Cannot find module lib/settle.ts` | 8/8, y +3 por huecos de cobertura (carrera entre procesos, nodo de live, URLs por defecto) |
| Checkout API | No existen las rutas | 14/14, y +2 (error de BD no disfrazado de `tx_already_used`, comercio sin nombre) |
| Payment links | `Cannot find module lib/payment-links.ts` | 6/6 |
| `format` | `Cannot find module lib/format.ts` | 3/3 |
| Blockscout | `Cannot find module lib/blockscout.ts` | 2/2, y probado contra la API real |
| `verify` con transferencias internas | 2 fallos (los casos que deben aceptar) | 21/21 |
| `settle` con Blockscout | 3 fallos | 15/15 |
| Bloque que falta | `TypeError: … reading 'timestamp'` | 16/16 |

**Suite completa: 129 tests, 100 % de líneas, ramas y funciones** en `lib/` y `/v1`. Para probar sin red se creó `test/helpers/fake-node.ts`: un nodo de Base falso que sirve las transacciones reales guardadas, controla las confirmaciones y simula fallos (nodo caído, bloque que falta, Blockscout caído o sin indexar).

## Pendiente

- Webhooks y el *worker* que comprueba pagos sin esperar a que alguien consulte (fase 7).
- Un pago con transacción que nunca llega a minarse se queda en `processing` para siempre; el worker deberá darlo por fallido pasado un tiempo.
- La página `/pay` no tiene tests automáticos de interfaz (haría falta una cartera simulada); se valida con las pruebas E2E manuales.
