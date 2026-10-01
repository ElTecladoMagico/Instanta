# 12 · Dashboard, tienda de ejemplo y retirada de Convex

**Fecha:** 01–02/10/2026 · **Fase del calendario:** 8 · **Decisiones:** [ADR-006](../decisions/006-autenticacion-clerk-y-api-keys.md), [ADR-012](../decisions/012-alcance-del-producto.md), [ADR-002](../decisions/002-postgres-sql-en-vez-de-convex.md)

## Qué se hizo

La cara visible del producto y el último paso de la migración:

| Rama | Qué añade |
|---|---|
| `feat/merchants` | Lógica del panel con tests: crear el comercio al entrar con Clerk, perfil con cartera validada por checksum, listar y revocar API keys, activar enlaces de pago, reenviar avisos fallidos |
| `feat/dashboard` | Panel nuevo en `/dashboard`: pagos, enlaces de pago (con el código para pegar), desarrolladores (API keys, endpoint de webhooks, historial de avisos) y ajustes |
| `feat/demo-store` | Tienda de ejemplo en `https://instanta.scuda.es/demo/`, integrada como un comercio real |
| `chore/remove-convex` | Se borran `convex/`, el widget antiguo y las dependencias que sobraban |

## El dashboard

- **El comercio sale siempre de la sesión de Clerk**, en el servidor (`session.ts`). La URL ya no lleva el id del usuario (antes era `/dashboard/[userId]`): un comercio no puede ver ni tocar los datos de otro cambiando la URL (T6).
- **Server Components** leen los datos llamando directamente a `lib/`; **Server Actions** hacen los cambios. No hay una API interna ni `fetch` desde el navegador: menos código y la misma lógica probada que usa la API pública.
- El único componente de cliente (`ActionForm`) muestra el resultado de una acción: un error o un **secreto que solo se ve una vez** (API key o secreto de webhooks).
- La **cartera de cobro se valida con su checksum EIP-55** (`isAddress` de viem en modo estricto): una letra mal copiada se rechaza en vez de hacer perder los cobros.
- El middleware de Clerk protege `/dashboard`: sin sesión, redirige al inicio de sesión y después vuelve.
- Por ahora solo modo test (Base Sepolia), con una etiqueta visible.

## La tienda de ejemplo

Es lo que haría un comercio real, en ~70 líneas sin dependencias (`examples/demo-store/`):

1. **Página del producto** (un café de 0,01 USDC).
2. **Comprar**: el servidor de la tienda crea el pago con su API key, guarda su número de pedido en `metadata` y redirige al checkout. El navegador nunca ve la API key.
3. **Webhook** (`/demo/webhook`): verifica la firma **con su propio código** (no usa el de Instanta, como un comercio real) e ignora avisos repetidos.
4. **Página del pedido**: se recarga hasta que llega el aviso.

Se sirve con Caddy en `/demo/…` (sin otro subdominio). Su API key y su secreto de webhooks están en `.env.demo`, solo en la VPS.

**Prueba real por internet:** se hizo caducar un pago de la tienda; el worker envió `payment_intent.expired` a `https://instanta.scuda.es/demo/webhook`, se entregó al primer intento y la tienda marcó su pedido como `expired`.

## Retirada de Convex

Con el dashboard y la tienda funcionando sobre Postgres, se borró lo que quedaba del prototipo: `convex/` (backend, cron y funciones), `ConvexClientProvider`, el widget antiguo (sustituido por `/pay`) y las dependencias `convex`, `canvas-confetti` y `concurrently`. El *lint* quedó **sin ningún aviso**: los que había desde el principio eran del código de Convex.

## Problemas encontrados

| Problema | Causa | Solución |
|---|---|---|
| Sin sesión, `/dashboard` devolvía **404** | `auth.protect()` de Clerk responde 404 si no hay página de inicio de sesión propia configurada | Redirigir explícitamente al inicio de sesión de Clerk |
| En producción, la vuelta tras iniciar sesión iba a `https://0.0.0.0:3000/dashboard` | Detrás de Caddy, Next.js ve su dirección interna | Construir la URL de vuelta con `NEXT_PUBLIC_APP_URL` |
| Tras cambiar el `Caddyfile`, Caddy seguía con la configuración vieja | `rsync` sustituye el archivo (nuevo inodo) y el contenedor, que lo monta como archivo suelto, sigue viendo el antiguo | `deploy.sh` reinicia Caddy en cada despliegue |
| El test de worker fallaba de forma intermitente | La BD local acumulaba pagos `processing` de otras ejecuciones y el worker comprueba los 50 más antiguos | El test retira antes los ajenos. **Límite real anotado:** con más de 50 pagos atascados, uno nuevo puede tardar hasta 1 h en comprobarse |
| Un test de reintentos dio 60,01 s en vez de ≤ 60 s | El reloj de Postgres (en la VM de Docker) va algo desfasado del de los tests | Margen de ±10 s en ese test |
| Tipos obsoletos al borrar rutas | La caché `.next/` guardaba tipos de las rutas borradas | Borrar `.next/` y recompilar |

## Evidencia TDD

| Pieza | RED | GREEN |
|---|---|---|
| Lógica del panel (`lib/merchants.ts`) | `Cannot find module lib/merchants.ts` | 8/8 |
| Tienda de ejemplo (`store.ts`) | `Cannot find module examples/demo-store/store.ts` | 6/6; verifica con su propio código las firmas que genera Instanta |
| Páginas del dashboard y servidor de la tienda | — (interfaz) | Build + comprobación en producción (redirección al login, `/demo/` 200, compra → 303 al checkout, webhook entregado) |

**Suite completa: 190 tests (Node) + 4 (pytest), 100 % de cobertura** en `lib/` y `/v1`.

## Pendiente

- Probar el panel con una sesión real de Clerk en producción (inicio de sesión del autor).
- Modo live en el panel (selector test/live) y migrar Clerk a una instancia de producción.
