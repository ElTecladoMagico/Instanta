# Decisiones de arquitectura (ADR)

| ADR | Decisión | Estado |
|---|---|---|
| [001](001-dev-workflow-no-docker.md) | Workflow de desarrollo con `concurrently`, sin Docker | Sustituida por 003 |
| [002](002-postgres-sql-en-vez-de-convex.md) | PostgreSQL con SQL a mano en vez de Convex | Aceptada |
| [003](003-monolito-worker-despliegue-vm.md) | Monolito Next.js + worker, desplegado en VM con Docker Compose | Aceptada |
| [004](004-modelo-de-amenazas.md) | Modelo de amenazas antes de implementar | Aceptada |
| [005](005-api-publica-contract-first.md) | API pública tipo Stripe, primero en OpenAPI | Aceptada |
| [006](006-autenticacion-clerk-y-api-keys.md) | Clerk para el dashboard, API keys propias para la API | Aceptada |
| [007](007-dinero-y-maquina-de-estados.md) | Dinero como entero y máquina de estados en SQL | Aceptada |
| [008](008-verificacion-on-chain.md) | Verificación on-chain como función pura, asociación por `tx_hash` | Aceptada |
| [009](009-webhooks-outbox.md) | Webhooks con outbox en Postgres y firma HMAC | Aceptada |
| [010](010-checkout-y-boton-embebible.md) | Checkout alojado único; el botón crea un PaymentIntent | Aceptada |
| [011](011-tests-y-ci.md) | Tests con `node:test` y CI en GitHub Actions | Aceptada |
| [012](012-alcance-del-producto.md) | Alcance del producto y trabajo futuro | Propuesta |
| [013](013-eth-nativo-en-testnet.md) | Admitir ETH nativo además de USDC (pruebas en testnet) | Aceptada |
| [014](014-migraciones-con-alembic.md) | Migraciones con Alembic (SQL a mano) en vez del script propio | Aceptada |
| [015](015-eth-desde-cuentas-inteligentes.md) | Pagos en ETH desde cuentas inteligentes (EIP-7702) vía transferencias internas de Blockscout | Aceptada |
| [016](016-proxy-compartido-en-la-vps.md) | HTTPS con un proxy compartido de la VPS en vez de un Caddy propio | Aceptada |

## Orden de implementación

Plazo máximo de desarrollo: **3 meses (1 oct – 31 dic 2026)**. Congelación de funcionalidades el 31 de diciembre (ADR-012).

| Fase | Semanas | Fechas | Trabajo | ADR |
|---|---|---|---|---|
| 0–2 | S1 | 1–7 oct | Limpieza de git (sacar `.cursor/` del staging, rama `api-v1`), modelo de amenazas revisado, spec OpenAPI | 004, 005, 012 |
| 3 | S2 | 8–14 oct | Esqueleto desplegado en la VM: Compose, Caddy, Postgres, migraciones, `/v1/health`, CI | 002, 003, 011 |
| 4 | S3–S4 | 15–28 oct | `verify()` con tests sobre recibos reales | 008, 011 |
| 5 | S5–S6 | 29 oct – 11 nov | API keys y PaymentIntents | 005, 006, 007 |
| 6 | S7–S8 | 12–25 nov | Checkout `/pay/...` y payment links (`button.js`) | 010 |
| 7 | S9 | 26 nov – 2 dic | Outbox, worker y webhooks | 009 |
| 8 | S10–S11 | 3–16 dic | Dashboard nuevo, tienda de ejemplo; se retira Convex | 006, 012 |
| — | S12–S13 | 17–31 dic | Colchón: retrasos, pulido, prueba E2E grabada, documentación | 011, 012 |
| 9 | — | desde 1 ene 2027 | Congelación: mediciones y redacción | 012 |

Si una fase se retrasa, se recorta de la fase 8, nunca de la 4 (verificación) ni de los controles de ADR-004.

Al terminar cada fase, los ADR implicados pasan de "Propuesta" a "Aceptada" (o se actualizan con lo que cambió).
