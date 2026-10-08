# ADR-003: Arquitectura de procesos y despliegue — monolito + worker en una VM con Docker Compose

**Fecha:** 30 de septiembre de 2026  
**Estado:** Aceptada (30/09/2026; esqueleto desplegado, el worker llega con la fase 4) — TLS con un proxy compartido de la VPS por [ADR-016](016-proxy-compartido-en-la-vps.md)  
**Contexto:** Con Postgres (ADR-002) aparecen servicios locales; sustituye a ADR-001

---

## Problema

ADR-001 descartó Docker porque no había ningún servicio local que orquestar, y anotó explícitamente que la decisión cambiaría si llegaba una base de datos propia. Con ADR-002 ese momento ha llegado. Además, el sistema necesita trabajo en segundo plano (esperar confirmaciones en la blockchain, reintentar webhooks, caducar pagos) que no encaja en el modelo de peticiones de Vercel.

Hay que decidir dos cosas: **cómo se reparten los procesos** y **dónde se despliegan**.

## Procesos

### Opción A: Microservicios (API, checkout, webhooks por separado) (descartada)

Tres despliegues, contratos entre ellos y más puntos de fallo para un dominio de 5 tablas y un solo desarrollador.

### Opción B: Monolito Next.js + un proceso `worker` (elegida)

- **`app`**: Next.js sirve la landing, el dashboard, el checkout y la API `/v1` (Route Handlers).
- **`worker`**: el mismo código fuente, otro punto de entrada (`worker/main.ts`). Un bucle que cada pocos segundos procesa pagos pendientes de confirmación, entregas de webhooks y caducidades (ver ADR-008 y ADR-009).
- El worker se ejecuta con Node 24, que ejecuta TypeScript directamente (*type stripping*), sin paso de compilación propio. Restricción: solo sintaxis TS "borrable" (nada de `enum` ni `namespace`).

## Despliegue

| | VM + Docker Compose | Cloud Run | Vercel |
|---|---|---|---|
| Postgres | En la VM, sin coste extra | Cloud SQL (~10 €/mes mínimo) o Neon | Neon |
| Worker siempre activo | Sí, un servicio más | Solo con CPU siempre asignada o Cloud Scheduler | No (cron limitado en el plan gratuito) |
| TLS | Caddy, automático | Incluido | Incluido |
| Coste | La VM que ya existe | Bajo, pero con Cloud SQL | Gratis + Neon |
| Valor para el TFG | Despliegue explicable de principio a fin | Escala que no se necesita | Oculta la infraestructura |

### Elegida: VM con Docker Compose

```yaml
services:
  postgres: { image: postgres:16, volumes: [pgdata:/var/lib/postgresql/data] }
  app:      { build: ., depends_on: [postgres] }
  worker:   { build: ., command: node worker/main.ts, depends_on: [postgres] }
  caddy:    { image: caddy:2, ports: ["80:80", "443:443"] }
```

- Next.js con `output: "standalone"` para una imagen pequeña.
- Una sola imagen para `app` y `worker`.
- Caddy hace de proxy inverso y obtiene el certificado TLS solo. Requisitos: IP pública y un dominio (o subdominio) apuntando a ella.
- Postgres **no** publica puerto hacia fuera.
- Sin backups: solo hay datos de testnet, que se pueden regenerar. Riesgo aceptado (ver Consecuencias).
- Secretos en un `.env` en la VM, fuera del repositorio.

**En desarrollo:** `docker compose up postgres` y `npm run dev` / `npm run worker` en local, con hot-reload nativo (se mantiene la ventaja que motivó ADR-001).

## Primer paso: esqueleto desplegado

Antes de escribir lógica de negocio se despliega en la VM un esqueleto mínimo de punta a punta: página "hola", `GET /v1/health` que consulta Postgres, migraciones aplicándose al arrancar y TLS funcionando. Así los problemas de despliegue salen el primer día y no la semana de la entrega.

## Consecuencias

- Se deja Vercel. `concurrently` y el script `dev:all` se eliminan.
- Una sola VM es un punto único de fallo y no hay backups: si el disco se pierde, se pierden los datos. Aceptable mientras solo haya datos de testnet; antes de operar en mainnet haría falta `pg_dump` diario a un almacenamiento externo. Se documenta como limitación.
- La VPS es una Hetzner CX23 (2 vCPU, 4 GB, Helsinki) con Ubuntu 26.04, preparada con `infra/provision.sh`; el dominio es `instanta.scuda.es`.
- **Camino a Cloud Run**: al estar todo en contenedores, migrar es cambiar variables de entorno (`DATABASE_URL` a Cloud SQL) y lanzar el worker como servicio con CPU siempre asignada. Queda como trabajo futuro.

## Decisión

Monolito Next.js más un proceso worker, desplegados en la VM propia con Docker Compose, Postgres y Caddy. ADR-001 pasa a estado "Sustituida por ADR-003".
