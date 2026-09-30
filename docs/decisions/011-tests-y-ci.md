# ADR-011: Calidad — tests con `node:test` y CI en GitHub Actions

**Fecha:** 30 de septiembre de 2026  
**Estado:** Propuesta  
**Contexto:** El prototipo no tiene ningún test y las comprobaciones de seguridad (ADR-004) necesitan demostrarse

---

## Problema

Sin tests no hay forma de demostrar que los controles de ADR-004 funcionan, ni de cambiar el código sin miedo a romper la verificación de pagos. El capítulo de pruebas del TFG también necesita resultados reproducibles.

## Opciones Evaluadas

### Opción A: Jest o Vitest (descartada)

Añaden dependencia y configuración. Para lo que se necesita, Node trae su propio runner.

### Opción B: `node:test` + `node:assert` (elegida)

Viene con Node 24, que además ejecuta TypeScript sin compilar. Cero dependencias nuevas.

## Qué se prueba

| Nivel | Qué | Cómo |
|---|---|---|
| Unidad | `verify()` (ADR-008) | Recibos reales de Base Sepolia guardados en `test/fixtures/*.json`: válido, importe corto, otro destinatario, otro token, revertida, antigua. Sin red. |
| Unidad | Firma de webhooks, generación y hash de API keys, ids | Funciones puras |
| Integración | API `/v1` contra Postgres real | Postgres en Docker; cada test en una transacción que se deshace, o BD recreada por ejecución |
| Integración | Controles de ADR-004 con test | Uno por fila: T1, T2, T3, T4, T5, T6, T7, T8 |
| Manual / E2E | Pago completo en Sepolia con cartera real | Guion en `docs/`; se repite antes de cada entrega y se graba para la demo |

No se persigue un porcentaje de cobertura: se prueban la verificación, el dinero y la seguridad.

## CI

`.github/workflows/ci.yml` en cada push y PR:

1. `npm ci`
2. `tsc --noEmit`
3. `npm run lint`
4. Servicio `postgres:16` → migraciones → `node --test`

Unas 20 líneas de YAML. El workflow existente `sync-data-ai-automations.yml` no pertenece a este proyecto y se elimina.

## Consecuencias

- Los fixtures se capturan una vez con un script pequeño (`scripts/capture-receipt.ts <tx_hash>`) y se versionan.
- Los tests de integración necesitan Docker en local; en CI, el servicio de Postgres de GitHub Actions.
- Los resultados alimentan directamente el capítulo de pruebas.

## Decisión

Tests con `node:test`, centrados en verificación, dinero y seguridad, y CI en GitHub Actions con typecheck, lint y tests.
