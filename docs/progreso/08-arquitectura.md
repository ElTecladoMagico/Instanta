# 08 · Mapa de la arquitectura: piezas, conexiones, Caddy y túneles

**Fecha:** 30/09/2026 · Estado del sistema al terminar la fase 4.

## Vista general

```
 Navegador / servidor del comercio
        │  https://instanta.scuda.es
        ▼
 DNS (Hostinger): instanta.scuda.es → 2.29.26.129
        ▼
 ┌──────────────────── VPS Hetzner ────────────────────────────────────┐
 │ ufw: solo deja pasar 22, 80 y 443                                   │
 │                                                                     │
 │  ┌─────────┐  HTTP interno   ┌──────────────┐    SQL    ┌──────────┐ │
 │  │  caddy  │ ──────────────▶ │     app      │ ────────▶ │ postgres │ │
 │  │ :80 :443│   app:3000      │   Next.js    │  :5432    │  (datos) │ │
 │  └─────────┘                 │ /v1/…        │           └──────────┘ │
 │   TLS, certificado           └──────┬───────┘                ▲       │
 │                                     │ JSON-RPC               │ al    │
 │                              ┌──────▼──────┐          ┌──────┴────┐  │
 │                              │  (futuro)   │          │  migrate  │  │
 │                              │   worker    │          │  Alembic  │  │
 │                              └──────┬──────┘          └───────────┘  │
 └─────────────────────────────────────┼───────────────────────────────┘
                                       ▼
                        Nodo de Base Sepolia (sepolia.base.org)
```

## Cada pieza

| Pieza | Dónde | Qué hace |
|---|---|---|
| Orquestación | `compose.yaml` | Define los contenedores y el orden de arranque: Postgres sano → `migrate` terminado → `app` → `caddy`. Docker crea una red privada donde los contenedores se encuentran por nombre (`postgres`, `app`), sin IPs |
| Migraciones | `db/` (Alembic) | `env.py` lee `DATABASE_URL` y aplica las migraciones de `versions/` que falten; cada una tiene `upgrade()` y `downgrade()` en SQL |
| Conexión a la BD | `lib/db.ts` | Pool de conexiones; importes `NUMERIC` ↔ `bigint`; `numeric()` para escribir importes sin límite de 2⁶³ |
| Ids | `lib/ids.ts` | `pi_…`, `req_…` con 128 bits aleatorios |
| Cliente de la blockchain | `lib/rpc.ts` | JSON-RPC: un `POST` con JSON al nodo |
| Verificación | `lib/verify.ts` | Decide si una transacción paga un pago: `succeeded`, `processing` o `failed`. Función pura, sin red ni BD |
| API | `src/app/v1/…/route.ts` | En Next.js la ruta del archivo es la URL. Cada archivo exporta `GET`/`POST` |
| Prototipo | landing, dashboard, widget, `convex/` | Siguen funcionando contra Convex y Clerk hasta que las fases 5–8 los sustituyan |
| Tests | `test/`, `db/tests/` | `node:test` para TypeScript y pytest para las migraciones, contra un Postgres real |
| CI | `.github/workflows/ci.yml` | En cada push: tipos, lint, migraciones y tests con cobertura |
| Despliegue | `infra/deploy.sh` | `rsync` del código a la VPS + `docker compose up --build` |

## Cómo se conectarán (fases 5–7)

1. El servidor del comercio llama a la API `/v1` con su API key y crea un pago en Postgres.
2. El comprador paga desde el checkout y envía el `tx_hash` de su transacción.
3. El worker pide al nodo el recibo (`rpc`), decide con `verify` y guarda el resultado y el evento del webhook en la misma transacción de la BD.
4. El worker envía el webhook firmado al servidor del comercio.

## Caddy

Caddy es un servidor web escrito en Go. En Instanta hace dos cosas con un `Caddyfile` de 3 líneas:

**1. HTTPS automático (protocolo ACME con Let's Encrypt).** Al arrancar ve el dominio y pide un certificado:

1. Let's Encrypt le pide que demuestre que controla `instanta.scuda.es` publicando un *token* en `http://instanta.scuda.es/.well-known/acme-challenge/…` (reto HTTP-01).
2. Caddy lo sirve por el puerto 80; Let's Encrypt lo comprueba y emite el certificado (válido 90 días).
3. Caddy lo guarda en el volumen `caddy_data` y lo renueva solo unos 30 días antes de caducar.

Además redirige HTTP → HTTPS y activa HTTP/2 y HTTP/3 (por eso se abre `443/udp`).

**2. Proxy inverso.** `reverse_proxy app:3000` recibe cada petición HTTPS, la descifra y se la pasa a Next.js por la red interna de Docker. La aplicación nunca queda expuesta directamente a internet.

Sin logs de acceso: las URLs del checkout llevarán el `client_secret` (ADR-010).

## Túneles: qué son y por qué no hacen falta aquí

Caddy **no** crea túneles; se suelen usar juntos, de ahí la confusión.

- Un **túnel** hace falta cuando el servidor **no tiene IP pública** (por ejemplo, un portátil detrás del router de casa). Un programa dentro abre una conexión *saliente* hacia un servidor público, y el tráfico que llega a ese servidor vuelve por esa conexión.
- La VPS **sí tiene IP pública**: el tráfico llega directo a Caddy. No hace falta túnel.

Herramientas de túnel de código abierto: **frp**, **rathole**, **bore**, **Pangolin** y, la más simple, **SSH** (`ssh -R`). Cloudflare Tunnel tiene el cliente (`cloudflared`) abierto pero el servicio es de Cloudflare; ngrok no es de código abierto.

**Uso posible en el proyecto:** exponer el `localhost:3000` del portátil con HTTPS real durante el desarrollo (probar la cartera en el móvil, recibir webhooks en la tienda de ejemplo sin desplegar):

1. `ssh -R 8080:localhost:3000 instanta`: abre un túnel desde el puerto 8080 de la VPS hasta el portátil.
2. Un bloque más en el Caddyfile, `dev.instanta.scuda.es { reverse_proxy <host>:8080 }`, pone HTTPS delante.

SSH hace el túnel y Caddy pone el HTTPS. No está montado; se hará si hace falta.
