# ADR-017: Arquitectura interna — núcleo puro y un módulo por agregado, sin capas formales

**Fecha:** 8 de noviembre de 2026  
**Estado:** Aceptada (08/11/2026; rama `refactor/agregado-pi`, entrada 17 del diario)  
**Contexto:** Con el producto completo (ADR-002 a ADR-016), una revisión de arquitectura del código de `lib/` antes de describirlo en la memoria

---

## Problema

`lib/` creció fase a fase y la revisión encontró problemas de cohesión, no de diseño:

1. Las escrituras sobre `payment_intents` estaban repartidas entre `payment-intents.ts`, `checkout.ts` y `settle.ts`. Para saber qué transiciones de ADR-007 existen había que leer tres archivos.
2. `events.ts` y `payment-intents.ts` se importaban el uno al otro.
3. `merchants.ts` estaba organizado por consumidor (el dashboard) y mezclaba claves, enlaces de pago y reenvío de eventos.
4. Tipos abiertos y repetidos: `status` y `currency` eran `string`, `"usdc" | "eth"` aparecía en cuatro sitios y los decimales en dos.
5. El cuerpo del webhook y el evento de la API se construían por separado, con dos tipos `EventRow`.
6. `verify.ts`, el núcleo puro, importaba un tipo del adaptador de Blockscout.
7. `rpc.ts` y `blockscout.ts` no tenían tiempo de espera, y la paginación de Blockscout no tenía límite.

Había que decidir con qué estructura se corregía todo esto y cómo se explica en la memoria.

## Opciones evaluadas

### Opción A: DDD completo (descartada)

Entidades y objetos de valor como clases (`PaymentIntent`, `Money`, `Address`), repositorios, servicios de aplicación y carpetas `domain/`, `application/` e `infrastructure/`.

**Por qué se descartó:**

- El dominio tiene un solo agregado con reglas de verdad (el pago) y una máquina de estados de seis estados. Las reglas que importan ya las garantiza Postgres: `CHECK`, `UNIQUE(tx_hash)` y el `UPDATE ... WHERE status = <esperado>` de ADR-007. Una clase `PaymentIntent` que validara transiciones en memoria repetiría esas reglas y, con dos procesos (API y worker), sería la opción descartada en ADR-007.
- Un repositorio por tabla sería una capa de una sola implementación encima de SQL escrito a mano, que es justo lo que ADR-002 eligió por ser explicable.
- Triplicaría el número de archivos de `lib/` sin cambiar ningún comportamiento.

### Opción B: Arquitectura hexagonal con puertos (descartada)

Interfaces (`PaymentRepository`, `ChainReader`, `EventPublisher`) con adaptadores para Postgres, el nodo y Blockscout, inyectados en los casos de uso.

**Por qué se descartó:**

- Cada puerto tendría una única implementación. Los tests no necesitan dobles: usan la base de datos real y un nodo falso por HTTP (`test/helpers/fake-node.ts`), que prueban también el SQL y el formato de las respuestas.
- La parte que sí conviene aislar, la decisión de si una transacción paga un pago, ya está aislada: `verify()` es una función pura que recibe los datos y devuelve un veredicto (ADR-008).

### Opción C: Núcleo puro y un módulo por agregado, sin capas formales (elegida)

Se mantiene la estructura plana de `lib/` y se corrige la cohesión con tres reglas:

1. **Núcleo puro.** `verify.ts` (reglas de verificación) y `money.ts` (monedas, decimales y formato) no hacen I/O: no importan `db.ts`, `rpc.ts` ni `blockscout.ts`, ni usan `fetch`. El núcleo es dueño de sus tipos (`InternalTransfer`, `FailureCode`, `Verdict`) y los adaptadores los importan.
2. **Un módulo por agregado o concepto.** `payment-intents.ts` contiene todas las escrituras en `payment_intents`, con una función por flecha del diagrama de estados, y guarda el evento en la misma transacción (outbox). `api-keys.ts`, `payment-links.ts`, `webhook-endpoints.ts`, `events.ts` y `merchants.ts` tienen cada uno lo suyo, lo use la API o el dashboard.
3. **Orquestación aparte.** `checkout.ts` valida y decide qué transición pedir; `settle.ts` lee la cadena, llama a `verify()` y pide la transición. Ninguno escribe SQL sobre `payment_intents`.

## Diseño

```
src/app/v1, src/app/dashboard, worker     entrada: rutas finas, Server Actions y el bucle del worker
        │
        ▼
checkout.ts · settle.ts · worker.ts       orquestación
        │
        ▼
payment-intents.ts · events.ts · api-keys.ts · payment-links.ts · webhook-endpoints.ts · merchants.ts
        │                                 un módulo por agregado (SQL a mano, db.ts)
        ▼
verify.ts · money.ts                      núcleo puro
        ▲
rpc.ts · blockscout.ts · webhooks.ts · ssrf.ts · payer.ts     adaptadores hacia fuera (nodo, Blockscout, comercio)
```

| Transición (ADR-007) | Función de `lib/payment-intents.ts` | La llama |
|---|---|---|
| → `requires_payment` | `createPaymentIntent` | API, botón (`payment-links.ts`) |
| registrar el pagador (sin cambio de estado, T13) | `setPayer` | `checkout.ts` |
| `requires_payment` → `processing` | `markProcessing` | `checkout.ts` |
| `processing` → `succeeded` \| `failed` | `markResult` | `settle.ts` |
| `requires_payment` → `expired` | `expirePayments` | lecturas (perezosa) y worker |
| `requires_payment` → `canceled` | `cancelPaymentIntent` | API |

`test/architecture.test.ts` comprueba las dos reglas que más fácilmente se rompen sin darse cuenta: que el núcleo no importa I/O y que ningún otro archivo de `lib/`, `src/`, `worker/` o `scripts/` contiene `UPDATE payment_intents`.

## Consecuencias

- Las transiciones del pago se leen en un archivo, con el diagrama en su cabecera, y la memoria puede mostrar el mismo diagrama con la función de cada flecha.
- El nombre de lo que se hace es el del dominio (pago, pagador, veredicto, evento), pero sin las piezas de DDD que no aportan aquí.
- No se puede cambiar Postgres por otra base de datos sin tocar los módulos. Se acepta: ADR-002 eligió Postgres precisamente por sus garantías.
- En la memoria no se afirma "arquitectura hexagonal" ni "DDD": se habla de núcleo funcional con capa imperativa, de una regla de dependencias inspirada en la arquitectura hexagonal y de DDD táctico ligero (lenguaje ubicuo, agregado, eventos con outbox y capa anticorrupción en `blockscout.ts`).

## Cuándo reconsiderarlo

- **DDD con más estructura** si aparecen varios agregados con reglas propias que se cruzan: reembolsos, pagos parciales, suscripciones o varias cuentas por comercio. O si trabajan varias personas y hace falta separar módulos por equipo.
- **Puertos y adaptadores** cuando haya una segunda implementación real: otro proveedor de datos de la cadena además del nodo y Blockscout (un indexador propio, otra red), otra forma de entregar eventos (cola externa, ADR-009) o la necesidad de probar sin Postgres.
- Hasta entonces, añadir una de esas capas sería abstracción especulativa.

## Decisión

Núcleo puro (`verify.ts`, `money.ts`) sin I/O, un módulo por agregado con todas sus escrituras (`payment-intents.ts` concentra las transiciones de ADR-007) y módulos de orquestación finos, sin capas ni puertos formales. Las dos reglas principales se comprueban con un test.
