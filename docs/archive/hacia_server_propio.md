# Hacia un Server Propio: Análisis de DDD + CQRS para Instanta

## Índice

- [Contexto actual](#contexto-actual)
- [Análisis del dominio](#análisis-del-dominio)
- [CQRS — Ya existe de forma natural](#cqrs--ya-existe-de-forma-natural)
- [DDD — Dónde sí y dónde no encaja](#ddd--dónde-sí-y-dónde-no-encaja)
- [Por qué Convex limita DDD formal](#por-qué-convex-limita-ddd-formal)
- [Veredicto para el estado actual](#veredicto-para-el-estado-actual)
- [Cuándo sí tendría sentido](#cuándo-sí-tendría-sentido)
- [Recomendaciones para el TFG](#recomendaciones-para-el-tfg)

---

## Contexto actual

Instanta es una pasarela de pagos crypto para creadores de contenido digital. Permite generar un "botón de pago" embebible y que un comprador pague directamente wallet-a-wallet en la red Base (Sepolia testnet).

### Tech stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) + React 19 |
| Backend / DB | Convex (serverless, real-time) |
| Auth | Clerk |
| Blockchain | wagmi + viem en Base Sepolia |
| Estilos | Tailwind CSS 4 con tema Material Design 3 |

### Estructura del proyecto

```
.
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Landing page
│   │   ├── layout.tsx          # Root layout (Clerk + Convex providers)
│   │   ├── auth-callback/      # Redirect post-login
│   │   ├── dashboard/[userId]/ # Dashboard del merchant
│   │   └── widget/             # Checkout (iframe)
│   └── components/
│       ├── landing/            # Secciones de la landing
│       └── dashboard/          # Componentes del dashboard
├── convex/
│   ├── schema.ts               # Esquema DB (users, buttons, payments)
│   ├── payments.ts             # Queries y mutations
│   ├── crons.ts                # Jobs programados (polling de pagos)
│   └── blockchain/             # Interacción con blockchain
├── lib/
│   └── usdc/                   # Contrato USDC (dirección + ABI)
├── public/
│   ├── button.js               # Script embebible
│   └── test-button.html        # Página de test del widget
└── docs/
```

### Entidades del dominio

| Entidad | Campos clave | Rol |
|---------|-------------|-----|
| **User** | userId (Clerk), email, name, defaultWallet | Creador autenticado |
| **Button** | userId, amount, toAddress, currency, title | Configuración de pago |
| **Payment** | buttonId, userId, paymentId, status, txHash, completedAt | Intento de pago |

### Relaciones

```
User (1) ──→ (N) Buttons
Button (1) ──→ (N) Payments
User (1) ──→ (N) Payments (vía Buttons)
```

---

## Análisis del dominio

### Complejidad actual: **Baja**

La lógica de negocio se reduce a:

1. Un usuario crea un botón con datos de pago (CRUD simple).
2. Un comprador inicia un pago — se crea registro con estado `pending`.
3. El comprador envía la transacción en blockchain.
4. Un cron cada 5s consulta `eth_getTransactionReceipt` y actualiza el estado a `confirmed` o `failed`.

No existen:
- Invariantes complejos entre agregados.
- Reglas de negocio entrelazadas con bifurcaciones condicionales.
- Máquinas de estado complejas (solo `pending → confirmed | failed`).
- Lógica que cruce múltiples entidades de forma no trivial.

Las operaciones son esencialmente **CRUD + polling externo**. Este es exactamente el tipo de proyecto donde DDD introduce más ceremonia que valor.

---

## CQRS — Ya existe de forma natural

Convex ya separa estructuralmente **queries** (lecturas) de **mutations** (escrituras):

```typescript
// convex/payments.ts
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
```

Las `query` functions son el lado de lectura y las `mutation` functions son el lado de escritura. Esto **ya es CQRS** en su forma más simple.

El patrón formal de CQRS con Command Bus, Query Bus, handlers separados, DTOs, etc. no añade valor aquí porque:

- **No se necesitan modelos de lectura y escritura diferentes.** Los datos se leen y escriben con la misma forma.
- **No hay problemas de escala** donde lecturas y escrituras necesiten infraestructura separada.
- **Convex ya da reactividad en tiempo real** sin necesidad de Event Sourcing o proyecciones.

---

## DDD — Dónde sí y dónde no encaja

### Lo que NO tiene sentido aplicar

| Concepto DDD | Por qué no encaja |
|---|---|
| **Aggregates con invariantes** | No hay reglas de consistencia complejas. Un Payment no necesita proteger invariantes sobre Button. |
| **Repositories abstractos** | Convex ya es la capa de persistencia con API limpia. Abstraerlo con repositorios es una capa innecesaria. |
| **Domain Services** | No hay lógica que cruce múltiples entidades de forma compleja. |
| **Command/Query Handlers** | Las mutations/queries de Convex ya cumplen este rol. |
| **Unit of Work** | Convex maneja transaccionalidad internamente. |
| **Bounded Contexts** | Con 3 entidades simples, no hay subdominios que separar. |

### Lo que SÍ podría aportar valor (menor)

| Concepto | Valor potencial |
|---|---|
| **Value Objects** | `WalletAddress` (validar formato hex, checksum), `Amount` (no negativo, precisión), `Currency` (solo valores permitidos). Aportan validación y expresividad. |
| **Domain Events** | `PaymentCreated`, `PaymentConfirmed`, `PaymentFailed`. Útiles para notificaciones, webhooks o analytics futuros. Convex ya soporta esto con su modelo reactivo. |
| **Ubiquitous Language** | Ya existe naturalmente — Button, Payment, Creator, Buyer son términos claros del dominio. |
| **Entidades ricas** | Un Payment con métodos como `confirm()`, `fail()`, `isExpired()` en vez de patchear campos directamente. Añade claridad al código. |

---

## Por qué Convex limita DDD formal

DDD + CQRS formal nace del mundo de backends tradicionales (Java/Spring, .NET, Python/FastAPI + PostgreSQL) donde:

- Se controla la arquitectura completa.
- Se necesita gestionar transacciones manualmente.
- La capa de persistencia es un detalle de implementación que se quiere abstraer.
- Los handlers procesan comandos/queries de forma explícita.

**Convex rompe estas premisas:**

- Las mutations ya son transaccionales y atómicas.
- Las queries son reactivas por defecto.
- La base de datos está integrada en el runtime.
- No hay ORM que abstraer.

Implementar DDD formal sobre Convex sería como poner un chasis de Fórmula 1 sobre un kart: la estructura no encaja con el motor.

---

## Veredicto para el estado actual

| Aspecto | Puntuación (1–10) |
|---|---|
| **Viabilidad técnica** | 4/10 — Es posible, pero se lucharía contra Convex en vez de aprovecharlo |
| **Valor añadido** | 2/10 — Casi toda la ceremonia sería overhead sin beneficio real |
| **Sentido arquitectónico** | 3/10 — El dominio es demasiado simple para justificarlo |
| **Valor académico (TFG)** | 6/10 — Se puede discutir teóricamente como contrapunto |

---

## Cuándo sí tendría sentido

DDD + CQRS sería no solo válido sino recomendable si el proyecto evolucionara hacia:

| Escenario futuro | Por qué justifica DDD |
|---|---|
| **Multi-currency con tasas de cambio** | Lógica de conversión, validación de pares soportados, actualización de rates |
| **Sistema de fees** | Reglas complejas (% variable, tiers, descuentos por volumen) |
| **Disputas y reembolsos** | Máquinas de estado complejas con múltiples transiciones |
| **Multi-chain** | Lógica de routing entre blockchains, validación de direcciones por red |
| **Suscripciones recurrentes** | Billing cycles, reintentos, estados de gracia |
| **KYC/Compliance** | Reglas regulatorias por jurisdicción, flujos de verificación |
| **Backend propio** | FastAPI/NestJS + PostgreSQL en vez de Convex |

En ese escenario, con un backend tradicional y dominio complejo, la separación en capas (domain, application, infrastructure) y los patrones de DDD protegerían los invariantes del negocio y facilitarían el testing.

---

## Recomendaciones para el TFG

### 1. Documentar por qué NO encaja (lo más valioso)

En un TFG es más valioso demostrar **criterio arquitectónico** explicando por qué un patrón popular no aplica, que forzarlo donde no tiene sentido. La sección de análisis de este documento puede servir como base para esa argumentación en la memoria.

### 2. Aplicar Value Objects ligeros

Si se quiere mostrar influencia de DDD sin sobrearquitecturar, se pueden crear validaciones tipadas:

```typescript
// Ejemplo conceptual — no implementar sobre Convex
class WalletAddress {
  constructor(private readonly value: string) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
      throw new Error("Invalid wallet address");
    }
  }
  toString(): string { return this.value; }
}
```

Dentro de Convex, esto se traduce a validaciones en las mutations usando los validators de `convex/values`.

### 3. Construir un microservicio complementario (opción avanzada)

Si se desea demostrar DDD + CQRS en el TFG, considerar construir un **servicio independiente** donde el patrón sí aporte valor:

| Servicio | Por qué encaja |
|---|---|
| **Servicio de notificaciones/webhooks** | Tiene su propio dominio (suscripciones, reintentos, firma HMAC), estados complejos (pending, delivered, failed, retrying), y reglas de negocio reales (backoff exponencial, circuit breaker). |
| **Servicio de analytics** | Necesita separar escritura (ingerir eventos) de lectura (agregar métricas), que es exactamente lo que CQRS resuelve. |
| **Servicio de facturación** | Si se añade monetización, las reglas de billing (tiers, prorratas, límites) justifican DDD. |

Este servicio se construiría con un stack tradicional (FastAPI + PostgreSQL, o NestJS + PostgreSQL) donde DDD + CQRS sí aporta, y se contrastaría con la arquitectura Convex del core. Esto demuestra la capacidad de **elegir la herramienta correcta para cada problema**.

### 4. Sección sugerida para la memoria del TFG

> **"Evaluación de patrones arquitectónicos"**
>
> Se evaluó la aplicación de Domain-Driven Design (DDD) con Command Query Responsibility Segregation (CQRS) al núcleo del sistema. Tras el análisis, se concluyó que la complejidad del dominio actual (3 entidades, flujo lineal de estados, sin invariantes cruzados) no justifica la ceremonia adicional que estos patrones introducen. Además, el backend serverless (Convex) ya implementa una separación natural entre queries y mutations, proporcionando CQRS implícito.
>
> Se identificaron escenarios futuros (multi-currency, disputas, compliance) donde estos patrones sí aportarían valor, demostrando que la decisión arquitectónica es contextual y no absoluta.

---

*Documento creado: 2025-02-21*
*Última actualización: 2025-02-21*
