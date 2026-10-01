# ADR-006: Autenticación — Clerk para el dashboard, API keys propias para la API

**Fecha:** 30 de septiembre de 2026  
**Estado:** Aceptada (02/10/2026; el dashboard usa Server Actions con el comercio de la sesión, sin rutas /api/dashboard)  
**Contexto:** Aparece un segundo tipo de cliente (el servidor del comercio) que no puede iniciar sesión en un navegador

---

## Problema

Hay dos formas de hablar con Instanta:

1. **El comercio, en el dashboard**, desde un navegador.
2. **El servidor del comercio**, llamando a la API `/v1` sin intervención humana.

Además, hoy el backend confía en el `userId` que le manda el cliente (ADR-004, T6).

## Opciones Evaluadas

### Opción A: Autenticación propia completa (usuario, contraseña, sesiones) (descartada)

Hashing de contraseñas, recuperación, verificación de email, sesiones… Mucho código de alto riesgo que no es la aportación del proyecto.

### Opción B: Clerk para todo, incluidas las llamadas máquina a máquina (descartada)

Ata la API pública a un proveedor externo y no se parece a cómo se integra un comercio con Stripe.

### Opción C: Clerk para personas, API keys propias para máquinas (elegida)

- **Dashboard:** Clerk, ya instalado. En cada Route Handler del dashboard, `auth()` de `@clerk/nextjs/server` da el `clerk_user_id`, y con él se busca el `merchant`. El `userId` nunca llega como parámetro.
- **API `/v1`:** API keys implementadas a mano, que es la parte que tiene interés técnico.

## Diseño de las API keys

- **Formato:** `sk_test_` o `sk_live_` + 32 bytes aleatorios en base64url.
- **Almacenamiento:** solo `SHA-256(clave)` en `api_keys.key_hash`, más un prefijo visible (`sk_test_ab12…`) para que el comercio las reconozca. SHA-256 basta (no hace falta bcrypt) porque la clave es aleatoria de alta entropía, no una contraseña.
- **Verificación:** hash de la clave recibida → `SELECT ... WHERE key_hash = $1 AND revoked_at IS NULL`. La búsqueda por hash evita comparar secretos en el código.
- **Ciclo de vida:** se muestra una sola vez al crearla; se puede revocar; un comercio puede tener varias.
- **Modo:** el prefijo determina `livemode`, y con él la red (ADR-007).

**Alta del comercio:** el primer acceso al dashboard crea la fila en `merchants` (como hace hoy el prototipo, pero en el servidor).

## Consecuencias

- Dos caminos de autenticación que no se mezclan: las rutas `/v1` no aceptan sesión de Clerk, el dashboard no acepta API keys.
- El dashboard usa sus propios Route Handlers internos (`/api/dashboard/...`), no la API pública, para no exponer claves en el navegador.
- Si se quita Clerk en el futuro, solo cambia cómo se obtiene el `merchant` en el dashboard.

## Decisión

Mantener Clerk para las sesiones del dashboard e implementar API keys con hash SHA-256 para la API pública.
