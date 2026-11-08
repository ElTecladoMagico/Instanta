# 16 · Finalidad `safe` en live tras Denim

**Fecha:** 08/11/2026 · **Decisión:** [ADR-008](../decisions/008-verificacion-on-chain.md) (sección "Cambios") y [ADR-004](../decisions/004-modelo-de-amenazas.md) (T10) · **Rama:** `fix/finality-safe`

## Qué se hizo

En live, un pago pasaba a `succeeded` con 10 bloques encima del suyo. Con un bloque cada 2 s eran unos 20 s. Desde la actualización Denim (21-10-2026 en Base Sepolia y 5-11-2026 en la red principal), Base produce un bloque cada 200 ms, así que 10 bloques pasaron a ser unos 2 s. La protección frente a una reorganización (T10) se había quedado en casi nada.

**El cambio:**
- En live ya no se cuentan bloques. Se espera a que el bloque del pago sea `safe`, es decir, a que su lote esté publicado en Ethereum (unos 2 min según la documentación de Base).
  - `lib/settle.ts` pide `eth_getBlockByNumber("safe")` y cuenta las confirmaciones desde ese bloque.
  - En `lib/chains.ts`, la red live tiene `head: "safe"` y `confirmations: 1`: basta con que el bloque `safe` sea el del pago o uno posterior.
- En test se mantienen 2 bloques desde el último (`head: "latest"`), para que las pruebas sean ágiles.
- ADR-008 y la fila T10 de ADR-004 se actualizaron con el nuevo criterio.

## Por qué `safe` y no más bloques

- Contar N bloques dejó de tener sentido cuando cambió el ritmo de producción de bloques (ADR-008): el criterio dependía de un dato que Base puede volver a cambiar.
- `safe` se refiere a algo que sí importa: el lote del bloque ya está publicado en L1.
- `finalized` (finalidad en L1) llega unos 13 min después de `safe` (ADR-008). `succeeded` no la espera, y el riesgo que queda se documenta en T10.

## Cómo (ciclos TDD)

| # | Qué se garantiza | Test | RED | GREEN |
|---|---|---|---|---|
| 1 | En live, con muchos bloques encima pero sin ser `safe` → sigue en `processing`; en cuanto es `safe` → `succeeded` | `test/settle.test.ts` (dos tests "live:"), con `setSafe` en el nodo falso | `eba5840`: 2 fallan | `6f0f1ec`: 206/206 |
| 2 | Configuración por modo: test con `latest` y 2 bloques, live con `safe` | `test/chains.test.ts` | — (se actualizó en el mismo commit que el cambio) | `6f0f1ec` |

**Commits:** `eba5840` y `6f0f1ec`, mergeados con `5882c45`.

## Problemas encontrados

- El nodo falso no conocía la etiqueta `safe`. Se le añadió `setSafe(fixture, incluido)`, que fija el bloque `safe` en el de la transacción o en el anterior.
