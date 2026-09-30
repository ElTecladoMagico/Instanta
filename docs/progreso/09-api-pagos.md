# 09 · API keys y API de pagos (`/v1/payment_intents`)

**Fecha:** 30/09/2026 · **Fase del calendario:** 5 · **Decisiones:** [ADR-005](../decisions/005-api-publica-contract-first.md), [ADR-006](../decisions/006-autenticacion-clerk-y-api-keys.md), [ADR-007](../decisions/007-dinero-y-maquina-de-estados.md)

## Qué se hizo

La primera parte de la API tipo Stripe: un comercio con una API key puede **crear, consultar, listar y cancelar pagos** desde su servidor. Con TDD, en dos ramas (`feat/api-keys` y `feat/payment-intents`), y probado en producción con `curl`.

```bash
curl -X POST https://instanta.scuda.es/v1/payment_intents \
  -H "Authorization: Bearer sk_test_…" -H "content-type: application/json" \
  -d '{"amount":"1000000","currency":"usdc","metadata":{"order_id":"1234"}}'
```

## Cómo está organizado el código

Cada archivo tiene una sola responsabilidad y las rutas son muy finas:

```
petición HTTP
   │
   ▼
src/app/v1/payment_intents/…/route.ts   1. authenticate()  → ¿quién llama?          (lib/api-keys.ts)
                                        2. zod safeParse() → ¿los datos son válidos? (lib/payment-intents.ts)
                                        3. create/get/list/cancel → SQL              (lib/payment-intents.ts)
                                        4. ok() / apiError() → respuesta JSON        (lib/http.ts)
```

| Archivo | Responsabilidad |
|---|---|
| `lib/api-keys.ts` | Generar claves `sk_test_…`/`sk_live_…`, guardar solo su SHA-256 y autenticar la cabecera `Authorization: Bearer` |
| `lib/payment-intents.ts` | Validación de entradas (zod) y el SQL de cada operación |
| `lib/http.ts` | Respuestas JSON con `Request-Id` y errores con el formato de Stripe |
| `lib/chains.ts` | Red y contrato de USDC de cada modo: test → Base Sepolia (84532), live → Base (8453) |
| `scripts/dev-merchant.ts` | Crea un comercio de pruebas y su API key (hasta que exista el dashboard) |

## Decisiones de diseño y por qué

| Decisión | Por qué |
|---|---|
| **Las API keys se guardan solo como SHA-256** y se buscan por su hash | Si alguien lee la base de datos, no obtiene claves utilizables (T7). SHA-256 basta porque la clave son 256 bits aleatorios, no una contraseña |
| **`z.strictObject`** para el cuerpo de creación | Cualquier campo no previsto (por ejemplo `pay_to`) se rechaza con `400`: el cliente no puede elegir la cartera, la red ni el token (T5) |
| **`INSERT … SELECT FROM merchants WHERE payout_address IS NOT NULL`** | La cartera de cobro sale de la ficha del comercio en la misma sentencia. Si no tiene, no se inserta nada y se responde `422 payout_address_missing` |
| **Todas las consultas filtran por comercio y por modo** | El pago de otro comercio da `404`, como si no existiera (T6). Una clave de test no ve los pagos de live |
| **Caducidad perezosa** | Antes de leer se ejecuta un `UPDATE` que pasa a `expired` los pagos sin pagar vencidos. No hace falta un proceso aparte para que la API muestre el estado correcto |
| **Cancelar con `UPDATE … WHERE status = 'requires_payment'`** | Es la transición de ADR-007: si el pago ya cambió de estado, no se toca y se responde `409` |
| **Paginación por cursor** (`starting_after`) | Se ordena por `(created_at, id)` y se pide un elemento de más para saber si hay otra página. No se salta ni repite elementos aunque se creen pagos mientras se recorre |
| **El `client_secret` solo se devuelve al crear el pago** | En la BD solo está su hash (ADR-010). Stripe lo devuelve siempre, pero para eso habría que guardarlo en claro. Se actualizó la spec |
| **Importes con `numeric()`** | Para que los importes en wei por encima de 2⁶³ lleguen a Postgres como `NUMERIC` (entrada 06) |

## Evidencia TDD

| Paso | Comando | Resultado |
|---|---|---|
| RED (api keys) | `node --test test/api-keys.test.ts` | Falla: `Cannot find module lib/api-keys.ts` |
| GREEN (api keys) | mismo | 6 de 6 |
| RED (pagos) | `node --test test/payment-intents.test.ts` | Falla: no existen las rutas |
| GREEN (pagos) | mismo | 28 de 28 |
| Cobertura | `npm run test:coverage` | Rutas al 80–93 % de ramas: faltaba el `401` en tres endpoints → test nuevo → **100 % en todo** |
| Refactor | `/v1/health` pasa a usar `lib/http.ts` | 77 de 77 siguen pasando |
| Producción | `curl` contra `https://instanta.scuda.es` | Crear → `requires_payment`; consultar → `client_secret: null`; listar → 1; cancelar → `canceled`; sin clave → `401` |

## Qué garantizan los tests

| Área | Garantías |
|---|---|
| API keys (6) | Formato; el hash es SHA-256; la clave en claro no aparece en ninguna columna; una clave válida identifica comercio y modo; sin cabecera, con otro esquema, con clave inventada o revocada → rechazo |
| Crear (15) | `201` con todos los campos de la spec; `pay_to`, red y token los fija el servidor; ETH sin token; clave live → Base y USDC de mainnet; importes > 2⁶³ wei; `client_secret` guardado como hash; `expires_in`; 9 cuerpos inválidos → `400` con el parámetro culpable; sin cartera → `422` |
| Consultar (4) | Sin `client_secret`; pago de otro comercio → `404`; test no ve live; caducidad perezosa |
| Listar (4) | Solo los propios y en orden; paginación completa sin repetir; filtro por estado; `limit` fuera de rango → `400` |
| Cancelar (3) | `requires_payment` → `canceled`; segundo intento → `409`; pago ajeno → `404` y queda intacto |
| Autenticación (2) | Los cuatro endpoints exigen API key |

## Una herramienta útil: túnel SSH para llegar a Postgres de la VPS

Para crear el comercio de pruebas en producción hacía falta llegar a la base de datos de la VPS, que solo escucha en `127.0.0.1`. Se usó un **túnel SSH local**:

```bash
ssh -f -N -L 15432:127.0.0.1:5432 instanta   # el puerto 15432 del portátil lleva al 5432 de la VPS
DATABASE_URL=postgres://instanta:<contraseña>@127.0.0.1:15432/instanta node scripts/dev-merchant.ts …
```

Es el mismo concepto de túnel explicado en la entrada 08, en sentido inverso (`-L` trae un puerto remoto al portátil; `-R` lleva uno del portátil al servidor). Postgres sigue sin estar expuesto a internet.

## Pendiente

- `return_url` debería exigir `https` en modo live (lo dice la spec); ahora se admite `http` en ambos modos.
- El checkout (`/v1/checkout/…` y la página `/pay/…`) y los *payment links* son la fase 6.

## Commits

`feat/api-keys`: test RED · feat GREEN · chore(scripts) dev-merchant
`feat/payment-intents`: test RED · feat GREEN · test 401 en todos los endpoints · refactor(health) · docs(api) client_secret
