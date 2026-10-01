# Diario de progreso

Registro de lo que se hace en cada paso y **por qué**, para redactar después los capítulos de diseño, desarrollo y pruebas del TFG. Las decisiones de arquitectura están en [`../decisions/`](../decisions/README.md); aquí se cuenta cómo se llevaron a cabo.

Cada entrada sigue la misma estructura: **qué se hizo**, **por qué**, **cómo** (comandos o archivos clave), **problemas encontrados** y **commits**.

| # | Entrada | Fecha | Fase del calendario |
|---|---|---|---|
| 00 | [Punto de partida: análisis del prototipo y del repositorio](00-punto-de-partida.md) | 30/09/2026 | — |
| 01 | [Decisiones de arquitectura (ADR 002–012)](01-adrs.md) | 30/09/2026 | 0–2 |
| 02 | [Preparación de la VPS](02-vps.md) | 30/09/2026 | 3 |
| 03 | [Contrato de la API (OpenAPI)](03-openapi.md) | 30/09/2026 | 2 |
| 04 | [Esqueleto desplegado de punta a punta](04-esqueleto.md) | 30/09/2026 | 3 |
| 05 | [Migraciones con Alembic](05-alembic.md) | 30/09/2026 | 3 |
| 06 | [Tests de todo lo existente (y un fallo encontrado)](06-tests-existentes.md) | 30/09/2026 | 3 |
| 07 | [Verificación on-chain: `verify()`](07-verify.md) | 30/09/2026 | 4 |
| 08 | [Mapa de la arquitectura: piezas, conexiones, Caddy y túneles](08-arquitectura.md) | 30/09/2026 | — |
| 09 | [API keys y API de pagos (`/v1/payment_intents`)](09-api-pagos.md) | 30/09/2026 | 5 |
| 10 | [Checkout, payment links y primeras pruebas E2E con pagos reales](10-checkout.md) | 01/10/2026 | 6 |
| 11 | [Eventos, webhooks y worker](11-webhooks-worker.md) | 01/10/2026 | 7 |
