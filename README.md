# Instanta

Pasarela de pagos en criptomonedas **no custodial**, con una API al estilo de Stripe. El comprador paga en USDC (o ETH) desde su cartera directamente a la cartera del comercio, en la red **Base**; Instanta verifica el pago en la blockchain y avisa al comercio con un webhook firmado. Instanta nunca toca los fondos.

Trabajo de Fin de Grado (TFG) de Pedro Gabriel Mantese Masegosa · Desplegado en **https://instanta.scuda.es** (modo test, Base Sepolia) · Tienda de ejemplo en **https://instanta.scuda.es/demo/**

## Cómo se integra un comercio

```bash
# 1. Su servidor crea un pago con su API key
curl -X POST https://instanta.scuda.es/v1/payment_intents \
  -H "Authorization: Bearer sk_test_…" -H "content-type: application/json" \
  -d '{"amount":"10000000","currency":"usdc","metadata":{"order_id":"1234"},"return_url":"https://mitienda.com/pedido/1234"}'
# → { "id": "pi_…", "status": "requires_payment", "checkout_url": "https://instanta.scuda.es/pay/pi_…_secret_…", … }

# 2. Redirige al comprador a checkout_url, que paga con su cartera.
# 3. Recibe en su endpoint el webhook payment_intent.succeeded, firmado con Instanta-Signature.
```

Sin backend, también puede pegar un botón en su web: `<script src="https://instanta.scuda.es/button.js" defer></script><button data-instanta-link="pl_…">Pagar</button>`.

Contrato completo de la API: [`docs/api/openapi.yaml`](docs/api/openapi.yaml). Ejemplo de integración real: [`examples/demo-store/`](examples/demo-store/).

## Arquitectura

| Pieza | Tecnología |
|---|---|
| Web, dashboard, checkout y API `/v1` | Next.js 16 (App Router) + React 19 |
| Base de datos | PostgreSQL 18, SQL escrito a mano con el driver `postgres` |
| Migraciones | Alembic (Python), con SQL a mano |
| Inicio de sesión del comercio | Clerk |
| Cartera del comprador | wagmi + viem |
| Verificación on-chain | JSON-RPC al nodo de Base + Blockscout para transferencias internas |
| Trabajo en segundo plano | Proceso `worker` (Node 24) |
| Despliegue | VPS con Docker Compose y Caddy (HTTPS automático) |

```
lib/            lógica (con tests): pagos, verificación on-chain, webhooks, API keys, SSRF…
src/app/v1/     API REST pública (rutas finas que llaman a lib/)
src/app/pay/    página de pago del comprador
src/app/dashboard/  panel del comercio (Server Components + Server Actions)
worker/         proceso en segundo plano: caduca, verifica y envía webhooks cada 5 s
db/             migraciones de Alembic
examples/demo-store/  tienda de ejemplo que se integra como un comercio real
infra/          preparación de la VPS y despliegue
test/           tests de Node (node:test) y fixtures con transacciones reales
docs/           decisiones (ADR), diario de progreso y contrato de la API
```

## Desarrollo local

Requisitos: Node 24, Docker y [`uv`](https://docs.astral.sh/uv/) (para Alembic).

```bash
npm install
cp .env.example .env.local          # claves de Clerk
docker compose up -d postgres       # PostgreSQL en localhost:5432
export DATABASE_URL=postgres://instanta:dev@localhost:5432/instanta
npm run db:migrate                  # aplica las migraciones
npm run dev                         # http://localhost:3000
npm run worker                      # en otra terminal
```

| Script | Qué hace |
|---|---|
| `npm test` / `npm run test:coverage` | Tests de Node (con cobertura de `lib/` y `/v1`) |
| `npm run test:db` | Tests de las migraciones (pytest) |
| `npm run db:migrate` | Aplica las migraciones pendientes |
| `npm run worker` | Arranca el worker |
| `infra/deploy.sh` | Despliega en la VPS |

## Documentación

- [`docs/decisions/`](docs/decisions/README.md): decisiones de arquitectura (ADR 001–015) y calendario.
- [`docs/progreso/`](docs/progreso/README.md): diario de lo hecho en cada fase y por qué, con la evidencia de los tests.
- [`docs/archive/`](docs/archive/): documentos del prototipo inicial.

## Licencia

Proyecto académico (TFG). Todos los derechos reservados.
