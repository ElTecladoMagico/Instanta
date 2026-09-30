# 02 · Preparación de la VPS

**Fecha:** 30/09/2026

## Qué se hizo

Se preparó el servidor donde se desplegará Instanta: acceso seguro por SSH, actualización, Docker, cortafuegos y protección frente a ataques de fuerza bruta. Todo con un script versionado: [`infra/provision.sh`](../../infra/provision.sh).

## El servidor

| | |
|---|---|
| Proveedor | Hetzner Cloud, tipo CX23 (2 vCPU, 4 GB RAM, 38 GB disco) |
| Ubicación | Helsinki (hel1) |
| Sistema | Ubuntu 26.04.1 LTS |
| IP | 2.29.26.129 (IPv4 estática) |
| Dominio | `instanta.scuda.es` (registro A en el DNS de Hostinger, donde está `scuda.es`) |

## Acceso por SSH

SSH usa dos claves distintas:

1. **La clave del usuario** (`~/.ssh/instanta_hetzner`, ED25519, protegida con *passphrase*): demuestra al servidor quién se conecta. La parte pública se registró en Hetzner al crear el servidor.
2. **La clave del servidor**: demuestra al usuario que habla con el servidor correcto. El Mac guarda su huella la primera vez y avisa si cambia.

**Problema encontrado:** el Mac tenía guardada una huella antigua para esa IP (de un servidor anterior), así que SSH bloqueó la conexión con el aviso de posible ataque *man-in-the-middle*. Se comprobó la huella real desde la consola web de Hetzner (un canal independiente de SSH) y, al coincidir (`SHA256:ljJKrRkChH1J9Ym4+KhN2ZgGsNXypRqKU4xxh8lLA0M`), se sustituyó la antigua. Se creó el alias `instanta` en `~/.ssh/config`.

*Detalle práctico:* la consola web de Hetzner interpreta el teclado como estadounidense, así que `_`, `*` o `|` salen cambiados. Se resolvió con autocompletado (Tab) y comodines.

## Qué hace `provision.sh` y por qué

| Paso | Por qué |
|---|---|
| `apt upgrade` | Parches de seguridad pendientes |
| Docker y Compose desde los repositorios de Ubuntu | Versiones recientes (29.1 / 2.40) sin añadir repositorios externos; las actualizaciones automáticas de Ubuntu los mantienen |
| SSH solo con clave (`PasswordAuthentication no`) | Nadie puede entrar adivinando contraseñas |
| Cortafuegos `ufw`: solo 22, 80 y 443 | Superficie mínima: SSH, HTTP (para obtener el certificado) y HTTPS |
| `fail2ban` | Bloquea IPs que fallan repetidamente el login |
| 2 GB de *swap* | El build de Next.js puede superar la RAM disponible |

El script es **idempotente** (se puede ejecutar varias veces sin romper nada) y se lanza desde el portátil con `ssh instanta 'bash -s' < infra/provision.sh`.

**Nota de seguridad:** Docker se salta `ufw` para los puertos que publica un contenedor. Por eso solo Caddy publica puertos hacia fuera; Postgres solo escucha en `127.0.0.1`.

## Resultado

- Login con contraseña rechazado: `Permission denied (publickey)`.
- En el primer minuto con `fail2ban` activo se bloquearon 12 IPs: el servidor ya estaba recibiendo intentos automáticos de acceso. Es un dato útil para justificar el endurecimiento en la memoria.
- Se reinició el servidor tras la actualización del núcleo y todos los servicios volvieron solos.

## Decisiones tomadas por el camino

- **Sin backups** (decisión del autor): solo habrá datos de testnet, que se pueden regenerar. Queda como limitación en el ADR-003; antes de usar mainnet haría falta `pg_dump` diario a un almacenamiento externo.
- **Sin usuario no-root dedicado:** root solo entra con clave, y un usuario en el grupo `docker` tendría de todas formas privilegios equivalentes a root.

## Commits

- `d5f5c04` chore(infra): add idempotent VPS provisioning script
- `2f1943c` chore: track Instanta docs, ignore .cursor, drop backups from ADR-003
