# ADR-007: Representación del dinero y máquina de estados del pago

**Fecha:** 30 de septiembre de 2026  
**Estado:** Propuesta  
**Contexto:** El prototipo guarda importes como `number` y los estados se pueden cambiar sin reglas

---

## Problema

1. **Importes:** `amount: v.number()` es un *float*. USDC tiene 6 decimales y los errores de redondeo en coma flotante son inaceptables con dinero. El widget, además, convierte el importe con `parseEther` (18 decimales, ETH).
2. **Estados:** `pending → confirmed | failed`, sin reglas sobre qué transición es válida ni protección frente a dos procesos cambiando el mismo pago a la vez.

## Importes

### Opción A: Decimal con coma (`NUMERIC(20,6)`, "10.50") (descartada)

Obliga a convertir en cada frontera y mezcla la representación humana con la de la cadena.

### Opción B: Entero en unidades mínimas (elegida)

Como Stripe (céntimos) y como la propia blockchain (1 USDC = 10⁶ unidades):

- En la BD: `BIGINT`. Un `BIGINT` admite hasta ~9,2 × 10¹² USDC, más que suficiente. (ponytail: si se añaden tokens de 18 decimales, pasar a `NUMERIC(78,0)`.)
- En TypeScript: `bigint`. Nunca `number`.
- En JSON: string (`"10000000"`), porque JSON no tiene enteros de 64 bits seguros.
- La conversión a "10,00 USDC" solo ocurre en la interfaz, con `formatUnits`/`parseUnits` de viem.

## Máquina de estados

```
requires_payment ──submit──▶ processing ──verificado──▶ succeeded
       │                        │
       ├──cancel──▶ canceled     └──verificación falla──▶ failed
       └──expires_at──▶ expired
```

| Estado | Significado |
|---|---|
| `requires_payment` | Creado, esperando que el comprador pague |
| `processing` | Hay `tx_hash`; esperando confirmaciones |
| `succeeded` | Verificado en la cadena con N confirmaciones (final) |
| `failed` | La transacción no cumple (importe, destino, token, revertida) (final) |
| `canceled` | Cancelado por el comercio antes de pagar (final) |
| `expired` | Pasó `expires_at` sin pago (final) |

### Opción A: Validar transiciones en código con una tabla de transiciones (descartada)

Dos procesos (la API y el worker) pueden leer el mismo estado y escribir a la vez.

### Opción B: Transiciones como `UPDATE` condicional (elegida)

```sql
UPDATE payment_intents
SET status = 'succeeded', amount_received = $2, succeeded_at = now()
WHERE id = $1 AND status = 'processing'
RETURNING *;
```

Si otro proceso ya lo movió, el `UPDATE` afecta a 0 filas y no pasa nada. No hacen falta locks ni una librería de máquinas de estado. Un `CHECK (status IN (...))` impide estados inválidos.

**Caducidad:** `expires_at` (por defecto 1 hora). Se aplica de forma perezosa: al leer, un pago en `requires_payment` con `expires_at < now()` se trata como `expired`, y el worker lo persiste.

## Tabla `payment_intents`

| Columna | Tipo | Nota |
|---|---|---|
| `id` | `text` PK | `pi_...` |
| `merchant_id` | FK | |
| `livemode` | `boolean` | test = Base Sepolia, live = Base mainnet |
| `amount`, `amount_received` | `bigint` | unidades mínimas |
| `currency` | `text` | `usdc` |
| `chain_id` | `int` | 84532 (Sepolia) / 8453 (mainnet) |
| `token_address`, `pay_to` | `text` | fijados al crear; el cliente no los elige |
| `status` | `text` + `CHECK` | |
| `tx_hash` | `text UNIQUE` | ADR-004, T2 |
| `client_secret_hash` | `text` | ADR-010 |
| `description`, `metadata` | `text`, `jsonb` | |
| `created_at`, `expires_at`, `succeeded_at` | `timestamptz` | |

`chain_id` y `token_address` se guardan por pago, aunque hoy solo haya una red y un token: así añadir otra red no exige migrar datos.

## Decisión

Importes como enteros en unidades mínimas (`BIGINT` / `bigint` / string en JSON). Estados con `CHECK` y transiciones mediante `UPDATE ... WHERE status = <esperado>`.
