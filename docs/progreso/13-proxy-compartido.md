# 13 · HTTPS con un proxy compartido de la VPS

**Fecha:** 01/10/2026 · **Decisión:** [ADR-016](../decisions/016-proxy-compartido-en-la-vps.md)

## Qué se hizo

Se sacó Caddy del `compose.yaml` de Instanta. El HTTPS lo pone ahora un proxy de la VPS (`/opt/edge`) que comparten todos los proyectos alojados en ella.

| Archivo | Cambio |
|---|---|
| `compose.yaml` | Fuera el servicio `caddy` y sus volúmenes. `app` y `demo-store` se unen a la red externa `edge` |
| `Caddyfile` | Borrado. Su contenido (rutas `/demo/*` → `demo-store:4000`, resto → `app:3000`) queda en ADR-016 como lo que debe hacer el proxy |
| `infra/deploy.sh` | Ya no reinicia Caddy (el reinicio se añadió en la entrada 12 por el problema del inodo de `rsync`, que deja de aplicar) |

## Por qué

Los puertos 80 y 443 solo los puede usar un proceso por máquina. Con Caddy dentro de Instanta, ningún otro proyecto de la VPS podría tener HTTPS sin tocar el repositorio de Instanta.

## Qué cambia en la red

```
internet ─▶ proxy (/opt/edge, :80 :443) ──red edge──▶ app:3000, demo-store:4000
                                                       │ red default (privada del proyecto)
                                                       ▼
                                                 postgres, worker, migrate
```

Postgres y el worker no están en la red `edge`: el proxy no puede llegar a ellos.

## Pendiente

- La configuración del proxy no está versionada en este repositorio: para reproducir el despliegue en otra VPS hay que crear la red `edge` y el proxy a mano (ADR-016).
- Comprobar en el proxy que no hay logs de acceso para `instanta.scuda.es` (las URLs `/pay/…` llevan el `client_secret`, ADR-010).

## Commits

- build(infra): serve app and demo-store through the shared VPS proxy instead of a project Caddy
- docs(adr): add ADR-016, HTTPS through the shared VPS proxy, and update README, ADR-003 and ADR-010
