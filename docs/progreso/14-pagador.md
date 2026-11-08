# 14 · El pagador firma antes de pagar (T13)

**Fecha:** 08/11/2026 · **Decisión:** [ADR-004](../decisions/004-modelo-de-amenazas.md) (nueva amenaza T13) · **Rama:** `fix/payer-binding`

## Qué se hizo

Una revisión de la memoria encontró un fallo en `verify()`: comprobaba a quién llegaban los fondos, pero no de quién salían.

**El ataque:**
1. El atacante abre un pago barato, por ejemplo desde el botón embebido, que es público.
2. Espera a que alguien haga una transferencia grande a la cartera del comercio. Puede ser el propio comercio moviendo fondos desde un exchange, u otro comprador.
3. Envía el hash de esa transferencia como si fuera suya.
4. El bloque es posterior al pago y el importe basta, así que el pago quedaba en `succeeded`.

**El arreglo:**
- **Firma antes de pagar.** El comprador firma con su cartera el mensaje `Instanta: authorize payment {id}`. No cuesta gas.
- **Verificación de la firma.** El servidor la comprueba en `POST /v1/checkout/{secret}/payer`. Si es de una cuenta normal, recupera la dirección. Si es de una cartera inteligente, pregunta a su contrato a través del nodo (ERC-1271/6492).
  - Si la firma vale, el servidor guarda `payer_address`.
  - Sin pagador registrado, `submit` responde `409 payer_required`.
- **Solo cuentan los fondos que salen del pagador.** `verify()` lo comprueba en cada caso:
  - USDC: `topics[1]` del `Transfer`;
  - ETH directo: `tx.from`;
  - ETH desde una cuenta inteligente: el remitente de la llamada interna, que ahora devuelve Blockscout.
  - Si los fondos salen de otra cartera, el pago falla con `wrong_payer`.

## Por qué con una firma

Que el comprador se limitara a declarar su dirección no bastaba, porque el atacante podría declarar la de quien hizo la transferencia. Se plantearon tres opciones:
- **Firma (elegida).** Demuestra que se controla la cartera, a cambio de una ventana más en la cartera.
- **Una dirección de depósito por pago (CREATE2).** Habría evitado la ventana extra, pero exige contratos y barrer los fondos. Queda como línea futura (ADR-008).

La firma se pide antes de mover fondos. Así, si es inválida, se rechaza sin que el comprador haya pagado.

## Cómo (ciclos TDD)

| # | Qué se garantiza | Test | RED | GREEN |
|---|---|---|---|---|
| 1 | Blockscout devuelve el remitente (`from`) de cada transferencia interna | `test/blockscout.test.ts` | `0ae6b78`: falta `from` | `1481961`: 190/190 |
| 2 | `verify()` solo cuenta los fondos que salen del pagador (USDC, ETH directo y ETH interno), sin distinguir mayúsculas | `test/verify.test.ts` (5 tests de "Pagador") | `cb6fcda^`: 4 tests `wrong_payer` fallan | `cb6fcda`: 195/195, `tsc` y `test:db` OK |
| 3 | `/payer` acepta solo firmas válidas del mensaje de ese pago; `submit` exige pagador; el ataque acaba en `wrong_payer` | `test/checkout.test.ts` (sección "Pagador") | `c8667e2^`: no existe la ruta | `c8667e2`: 201/201, `tsc`, lint y `test:db` OK |
| 4 | Firmas de carteras inteligentes validadas por el contrato (aceptada y rechazada) | `test/checkout.test.ts` | — (son tests de cobertura: la implementación ya existía) | `66d19d9`: 203/203 |

**Comandos usados:**
- `DATABASE_URL=postgres://instanta:dev@localhost:5432/instanta npm test`
- `npm run test:db`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

**Fixtures:**
- `e2e-usdc`, `e2e-eth` y `eth-7702` se actualizaron con el campo `from` que devuelve la API real de Blockscout (Base Sepolia).
- Antes de escribirlo, se comprobó que el resto de los datos coincidía con lo que ya había.

**Cobertura** (`npm run test:coverage`):
- Global: 99,69 % de líneas.
- `lib/payer.ts`: 90,91 %. Solo queda sin probar la rama en la que el nodo falla al validar una firma de cartera inteligente, que se trata como firma inválida.

## Problemas encontrados

- **Restricción CHECK de `failure_code`.** Rechazaba `wrong_payer` y la detectó el test del ataque. La migración 0003 la amplía, y su `downgrade` convierte `wrong_payer` en `wrong_recipient` para poder volver a la restricción antigua.
- **Riesgo residual.** Si alguien ve el hash de un comprador antes de que este lo envíe, puede consumirlo (`UNIQUE(tx_hash)`) en un pago propio, que fallará con `wrong_payer`. El comprador legítimo tendría que pedir ayuda al comercio. Está documentado en ADR-004.

## Pendiente de probar a mano

Hace falta un pago real en Base Sepolia con MetaMask y con una cartera inteligente (Coinbase Smart Wallet). Así se comprueba la ventana de firma y la validación ERC-1271/6492 contra el nodo real.
