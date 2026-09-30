# ADR-004: Seguridad — modelo de amenazas antes de implementar

**Fecha:** 30 de septiembre de 2026  
**Estado:** Propuesta  
**Contexto:** Una pasarela de pagos cuyo prototipo se puede engañar para confirmar pagos que no existen

---

## Problema

Revisando el prototipo aparecen fallos que invalidan la función principal del producto:

1. `updatePayment` es una mutation pública: cualquiera puede poner un pago en `confirmed` desde la consola del navegador.
2. `pollReceipt` solo mira `receipt.status === "0x1"`. No comprueba destinatario, importe, token ni que el hash no se haya usado ya. Cualquier transacción exitosa confirma cualquier pago.
3. `createButton`, `updateUserWallet` y `getUser` reciben el `userId` como argumento sin comprobar quién llama.
4. El widget envía ETH (`parseEther`) aunque el producto cobra en USDC.
5. El `paymentId` se genera en el navegador con `Math.random()`.

Estos fallos no se arreglan con parches uno a uno: salen de no haber pensado quién puede atacar qué.

## Opciones Evaluadas

### Opción A: Corregir los fallos conocidos a medida que se reescribe (descartada)

Arregla lo que se ha visto, pero no lo que no se ha buscado.

### Opción B: Modelo de amenazas de una página, y un test por amenaza (elegida)

Antes de implementar, se lista cada amenaza con su control y el test que demuestra que el control funciona. Sirve de lista de comprobación durante el desarrollo y de sección del TFG.

## Modelo de amenazas

**Actores:** comprador malicioso, comercio malicioso, tercero en la red, atacante con una clave filtrada.

| # | Amenaza | Control | Test |
|---|---|---|---|
| T1 | Marcar como pagado sin pagar | El estado solo lo cambia el servidor tras verificar en la cadena. No existe endpoint que acepte un estado. | `submit` con hash inexistente → sigue sin pagar |
| T2 | Reutilizar una transacción real para varios pagos | `UNIQUE(tx_hash)` en `payment_intents` | Dos `submit` con el mismo hash → el segundo, `409 tx_already_used` |
| T3 | Pagar menos, a otra dirección o con otro token | `verify()` exige log `Transfer` del contrato USDC, `to` = comercio, `value >= amount` | Un caso por variante con recibos reales guardados |
| T4 | Usar una transacción anterior al pago | El bloque debe ser posterior a `created_at` del intent | Recibo antiguo → rechazado |
| T5 | Manipular el importe desde el cliente | El importe lo fija el servidor al crear el intent; el cliente solo envía `tx_hash` | El body de `submit` ignora cualquier `amount` |
| T6 | Leer o modificar recursos de otro comercio | Toda consulta filtra por `merchant_id` de la sesión o de la API key | Clave de A pidiendo `pi_` de B → `404` |
| T7 | Filtración de API keys | Se guarda solo el SHA-256; la clave se muestra una vez; revocación | La BD no contiene claves en claro |
| T8 | Webhook falsificado hacia el comercio | Firma HMAC-SHA256 con marca de tiempo (ADR-009) | Firma alterada o antigua → el ejemplo de verificación la rechaza |
| T9 | Adivinar ids de pago | Ids con 128 bits aleatorios de `crypto.randomBytes` | — |
| T10 | Reorganización de la cadena tras confirmar | N confirmaciones antes de `succeeded` (ADR-008) | — (riesgo documentado) |
| T11 | Clickjacking del checkout embebido | La firma de la transacción ocurre en la cartera, fuera del iframe; el iframe no puede mover fondos por sí solo | — (riesgo aceptado) |
| T12 | Secretos en el repositorio | `.env` fuera de git; ninguna credencial en URLs de remotes | Revisión manual antes de cada release |

## Controles que no se negocian

- El importe, la dirección de cobro y el token los decide el servidor.
- `UNIQUE(tx_hash)`.
- API keys solo como hash.
- Webhooks firmados.
- Comprobación de propiedad en cada acceso.
- Validación de entrada con `zod` en todos los Route Handlers.

## Consecuencias

- Cada fila con test se implementa como test automático (ver ADR-011).
- Las amenazas sin test (T10, T11) se documentan como limitaciones en la memoria.

## Decisión

Adoptar esta tabla como lista de requisitos de seguridad. Ninguna fase se da por terminada si rompe un control de la tabla.
