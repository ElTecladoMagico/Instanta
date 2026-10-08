# ADR-016: HTTPS con un proxy compartido de la VPS en vez de un Caddy propio

**Fecha:** 1 de octubre de 2026  
**Estado:** Aceptada  
**Contexto:** La VPS pasa a alojar otros proyectos además de Instanta; modifica ADR-003

---

## Problema

ADR-003 metía Caddy en el `compose.yaml` de Instanta, publicando los puertos 80 y 443. Solo un proceso de la máquina puede escuchar en esos puertos, así que un segundo proyecto en la misma VPS no podría tener su propio HTTPS.

## Opciones evaluadas

### Opción A: Mantener el Caddy de Instanta y añadir ahí los otros dominios (descartada)

Funciona, pero el repositorio de Instanta acabaría configurando servicios que no son suyos, y desplegar Instanta reiniciaría el HTTPS de todos.

### Opción B: Una VPS por proyecto (descartada)

Coste y mantenimiento duplicados (provisión, cortafuegos, actualizaciones) para servicios pequeños.

### Opción C: Un proxy compartido fuera del proyecto (elegida)

Un único proxy en `/opt/edge`, fuera de este repositorio, publica 80/443 y obtiene los certificados de todos los dominios. Cada proyecto conecta sus contenedores a una red Docker externa común, `edge`, y el proxy los alcanza por nombre de contenedor.

## Diseño

- `compose.yaml` de Instanta: sin servicio `caddy` ni volúmenes `caddy_data`/`caddy_config`; `app` y `demo-store` se unen a las redes `default` y `edge` (externa). `postgres`, `migrate` y `worker` siguen solo en `default`: no son alcanzables desde el proxy.
- `infra/deploy.sh` ya no reinicia Caddy.
- El proxy debe reproducir lo que hacía el `Caddyfile` borrado (en sintaxis de Caddy):

```caddy
instanta.scuda.es {
	encode zstd gzip
	redir /demo /demo/
	handle_path /demo/* {
		reverse_proxy demo-store:4000
	}
	handle {
		reverse_proxy app:3000
	}
}
```

- **Requisito de seguridad que se mantiene (ADR-010):** sin logs de acceso para este sitio, porque las URLs `/pay/…` llevan el `client_secret`.

## Consecuencias

- Instanta ya no publica ningún puerto en la VPS; solo el proxy lo hace.
- **La configuración del proxy no está en este repositorio.** Desplegar Instanta en una VPS nueva exige crear antes la red (`docker network create edge`) y el proxy con el bloque de arriba. Se acepta: el proxy es infraestructura de la máquina, no del proyecto.
- En local no cambia nada: solo se arranca `postgres`, que no usa la red `edge`. Los servicios con perfil `deploy` sí la necesitan.

## Decisión

Servir Instanta a través de un proxy HTTPS compartido de la VPS (`/opt/edge`), conectado por la red Docker externa `edge`. ADR-003 se mantiene salvo en la pieza de TLS.
