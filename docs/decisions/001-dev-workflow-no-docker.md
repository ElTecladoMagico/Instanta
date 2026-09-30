# ADR-001: Workflow de desarrollo — concurrently en vez de Docker

**Fecha:** 21 de febrero de 2026  
**Estado:** Sustituida por [ADR-003](003-monolito-worker-despliegue-vm.md) (30 de septiembre de 2026)  
**Contexto:** Simplificar el workflow de desarrollo local

---

## Problema

Desarrollar Instanta localmente requiere arrancar dos procesos en paralelo:

1. `npm run dev` — servidor de desarrollo de Next.js
2. `npx convex dev` — watcher de Convex que sincroniza funciones con Convex cloud

Esto obliga a abrir dos terminales cada vez, lo cual es tedioso y propenso a olvidar uno de los dos procesos.

## Opciones Evaluadas

### Opción A: Docker Compose (descartada)

Crear un `Dockerfile` + `docker-compose.yml` que orqueste ambos procesos en un contenedor.

**Por qué se descartó:**

- **No hay servicios locales que containerizar.** Convex, Clerk y Alchemy son todos servicios cloud (SaaS). Docker orquesta *servicios*; aquí no hay ninguno local.
- **Hot-reload degradado.** Next.js con Turbopack usa eventos nativos del sistema de archivos (instantáneos). Dentro de Docker, se necesita filesystem polling (~1s de latencia), significativamente más lento.
- **Conflictos de `node_modules`.** Los módulos compilados para macOS (host) no son compatibles con Linux (contenedor) y viceversa, lo que obliga a gestionar volumes excluyendo `node_modules`.
- **Complejidad injustificada.** Docker añadiría 4+ archivos de configuración (Dockerfile, docker-compose.yml, .dockerignore, scripts) para resolver un problema que se soluciona con 1 línea de JSON.
- **Señal académica negativa.** En un TFG, elegir la herramienta correcta para el problema demuestra mejor criterio de ingeniería que elegir la herramienta más compleja.

### Opción B: `concurrently` en package.json (elegida)

Añadir un script `dev:all` que ejecute ambos procesos en paralelo usando [`concurrently`](https://www.npmjs.com/package/concurrently).

```json
"dev:all": "concurrently -n next,convex -c blue,magenta \"npm run dev\" \"npx convex dev\""
```

**Por qué se eligió:**

- Resuelve exactamente el problema: un solo comando, una sola terminal
- Cero infraestructura nueva — solo una devDependency npm (~5M descargas/semana)
- Output diferenciado por colores y prefijos (`[next]`, `[convex]`)
- Hot-reload nativo intacto (sin capa Docker intermedia)
- Si un proceso falla, el otro sigue corriendo y se ve el error claramente

## Cuándo Docker sí tendría sentido

- Si el proyecto necesitara una base de datos local (PostgreSQL, Redis, etc.)
- Si se desplegara en una plataforma Docker (ECS, GKE, Fly.io) en vez de Vercel
- Si se adoptara Convex self-hosted (backend Docker + PostgreSQL local)
- Si hubiera múltiples desarrolladores que necesitaran entornos reproducibles bit a bit

## Perspectiva futura: Docker probablemente llegará

Esta decisión es **para el estado actual del proyecto**, no permanente. El análisis de evolución arquitectónica ([`hacia_server_propio.md`](../archive/hacia_server_propio.md)) identifica escenarios concretos donde Instanta podría migrar hacia un backend propio con stack tradicional (FastAPI/NestJS + PostgreSQL). En ese momento, Docker pasaría de ser complejidad innecesaria a herramienta imprescindible.

Servicios complementarios que justificarían Docker Compose:

| Servicio | Stack probable | Por qué necesita Docker |
|----------|---------------|------------------------|
| **Notificaciones / Webhooks** | NestJS o FastAPI + Redis (cola de reintentos) + PostgreSQL | Tiene su propio dominio con estados complejos (pending, delivered, failed, retrying), backoff exponencial y circuit breaker. Requiere Redis como broker de mensajes local. |
| **Analytics** | FastAPI + PostgreSQL (o ClickHouse) | Separa escritura (ingerir eventos) de lectura (agregar métricas) — CQRS real. Necesita base de datos local para desarrollo. |
| **Facturación / Billing** | NestJS + PostgreSQL | Reglas de billing (tiers, prorratas, límites) requieren un dominio rico y persistencia local para testing. |
| **Backend core propio** | FastAPI/NestJS + PostgreSQL (reemplazando Convex) | Si se escala a multi-currency, disputas, reembolsos o compliance/KYC, la complejidad del dominio justifica un backend tradicional con control total de la arquitectura. |

Cuando cualquiera de estos servicios se materialice, el setup de desarrollo pasaría a algo como:

```yaml
# docker-compose.yml (futuro)
services:
  postgres:
    image: postgres:16
  redis:
    image: redis:7-alpine
  api:
    build: ./services/api
    depends_on: [postgres, redis]
  next:
    build: .
    ports: ["3000:3000"]
```

En ese escenario, `concurrently` seguiría siendo útil *dentro* de cada servicio, pero Docker Compose orquestaría la infraestructura que hoy no existe.

## Decisión

Usar `concurrently` como devDependency con el script `npm run dev:all`. No introducir Docker en esta fase del proyecto. Revisitar esta decisión cuando se añadan servicios con dependencias locales (bases de datos, colas, microservicios).
