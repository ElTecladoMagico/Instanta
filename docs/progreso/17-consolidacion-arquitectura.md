# 17 · Consolidación de la arquitectura interna

**Fecha:** 08/11/2026 · **Decisión:** [ADR-017](../decisions/017-arquitectura-interna.md) (nueva) y corrección de [ADR-008](../decisions/008-verificacion-on-chain.md) · **Rama:** `refactor/agregado-pi`

## Qué se hizo

Una revisión de arquitectura de `lib/` concluyó que no hacía falta ni DDD completo ni arquitectura hexagonal con puertos: el código ya separaba un núcleo puro (`verify()`) de la parte con efectos. Faltaba cohesión. Se corrigió en pasos pequeños, cada uno con los tests en verde:

0. **Robustez** (único cambio de comportamiento):
   - `rpc.ts` y `blockscout.ts` abortan una petición a los 10 s (`AbortSignal.timeout`), igual que los webhooks;
   - la paginación de Blockscout se corta a las 20 páginas con un error, y el pago sigue en `processing`.
1. **`lib/money.ts`:** `CURRENCIES`, `Currency`, `DECIMALS` y `formatAmount`, que antes estaban repetidos o en `format.ts`. La URL del explorador pasa a `NETWORKS` en `chains.ts`. Se borra `lib/usdc/contract.ts`, que nadie importaba.
2. **Tipos cerrados:**
   - `status` es `Status` y `currency` es `Currency`, sin casts;
   - `FailureCode` incluye `tx_not_found`, y `settle.ts` reutiliza `Verdict`;
   - `Row` pasa a llamarse `PaymentIntentRow`.
3. **`InternalTransfer`** se define en `verify.ts`. El adaptador de Blockscout importa el tipo del núcleo, y no al revés.
4. **Agregado PaymentIntent:** todas las escrituras en `payment_intents` están en `lib/payment-intents.ts`, con una función por flecha del diagrama de ADR-007, que va en la cabecera del archivo:
   - `setPayer` y `markProcessing` salen de `checkout.ts`;
   - `markResult` es el antiguo `save` de `settle.ts`;
   - `expirePayments` y `cancelPaymentIntent` ya estaban allí;
   - `recordEvent` (outbox) pasa a `payment-intents.ts`, su único usuario. Así se rompe el ciclo de imports con `events.ts`.
5. **`merchants.ts` repartido por concepto:** claves a `api-keys.ts`, botones a `payment-links.ts` y reenvío de eventos a `events.ts`.
6. **`eventPayload`** en `events.ts`: el webhook y `/v1/events` construyen el evento con la misma función, y solo hay un tipo `EventRow`.
7. **`test/architecture.test.ts`:** comprueba que el núcleo puro no importa I/O y que ningún otro archivo escribe en `payment_intents`.
8. **Documentación:** ADR-017, corrección de ADR-008 y estas entradas del diario (15, 16 y 17).

## Por qué

- Para saber qué transiciones tiene un pago había que leer tres archivos. Ahora están en uno, y la memoria puede mostrar el diagrama con la función de cada flecha.
- Sin tiempo de espera propio, una petición a un nodo que acepta la conexión y no responde esperaba lo que dejara `fetch` (en Node, hasta 300 s sin cabeceras de respuesta). Mientras, la vuelta del worker y el envío de webhooks quedaban parados.
- Las alternativas (DDD y hexagonal) se descartan en ADR-017, con lo que tendría que cambiar para reconsiderarlas.

## Cómo (ciclos TDD)

| # | Qué se garantiza | Test | RED | GREEN |
|---|---|---|---|---|
| 0a | `rpc()` lanza `TimeoutError` si el nodo no responde (espera de 100 ms en el test) | `test/rpc.test.ts` | `f31fd29`: falla por el límite de 2 s del test | `5542842`: 209/209 |
| 0b | `internalTransfers()` lanza `TimeoutError` si Blockscout no responde | `test/blockscout.test.ts` | `f31fd29`: ídem | `5542842` |
| 0c | Con paginación sin fin, `internalTransfers()` lanza tras exactamente 20 peticiones | `test/blockscout.test.ts` | `f31fd29`: ídem | `5542842` |
| 6 | El cuerpo firmado del webhook mantiene sus claves y su orden | `test/webhooks.test.ts` (`Object.keys(body)`) | — (test de caracterización: pasaba antes del cambio) | `0f9703f`: 209/209 |
| 7 | El núcleo puro no importa I/O; solo `payment-intents.ts` contiene `UPDATE payment_intents` | `test/architecture.test.ts` | — (se comprobó que falla si `money.ts` importa `db.ts` o si otro archivo contiene el `UPDATE`; en main habría fallado por `checkout.ts` y `settle.ts`) | `18ca4ce`: 211/211 |

Los pasos 1 a 6 son refactorizaciones sin cambio de comportamiento. Su garantía son los 209 tests existentes, que siguen en verde después de cada commit, junto con `tsc` y lint.

**Commits:**

| Paso | Commit |
|---|---|
| 0 (RED) | `f31fd29` |
| 0 (GREEN) | `5542842` |
| 1 | `4f0d7a8` |
| 2 | `d29538e` |
| 3 | `2cdb929` |
| 4 | `5a5e580` |
| 5 | `3ee7849` |
| 6 | `0f9703f` |
| 7 | `18ca4ce` |
| 8 | este commit de documentación |

**Comandos usados:**
- `DATABASE_URL=postgres://instanta:dev@localhost:5432/instanta npm test`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build` (pasos 1, 2 y 5, que tocan el dashboard o la página de pago)
- `npm run test:coverage`

`npm run test:db` no hacía falta: no se tocó `db/`.

**Cobertura** (`npm run test:coverage`, 211 tests):
- Global: 99,70 % de líneas, 98,35 % de ramas y 100 % de funciones.
- Todos los archivos de `lib/` al 100 % de líneas salvo `lib/payer.ts` (90,91 %), con la misma rama sin probar que en la entrada 14.
- `checkout.ts`: 88,89 % de ramas.
- La ruta `/v1/checkout/{secret}/payer`: 92 % de líneas. No hay test para su respuesta `409 payment_intent_unexpected_state`.

## Problemas encontrados

- **El commit RED no compila con `tsc`.** Los tests pasan un parámetro nuevo (el tiempo de espera) que aún no existía. Node ejecuta igual el test, porque solo borra los tipos, y el fallo que se ve es el del tiempo de espera.
- **El tiempo de espera es configurable solo por parámetro,** con 10 s por defecto. Así el test tarda 100 ms en vez de 10 s.
- **Con más de 20 páginas el pago no se resuelve solo.** Se queda en `processing` y el worker lo reintenta en cada vuelta. Se prefirió eso a darlo por fallido con datos incompletos. Un pago normal tiene unas pocas transferencias internas.
- **`checkout.ts` conserva dos casts a `` `0x${string}` ``** al validar la firma del pagador. La dirección y la firma ya se validan con una expresión regular en `PayerParams`.
