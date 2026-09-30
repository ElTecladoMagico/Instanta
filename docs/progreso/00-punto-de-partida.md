# 00 · Punto de partida: análisis del prototipo y del repositorio

**Fecha:** 30/09/2026

## Qué se hizo

Revisión del estado del repositorio y del código del prototipo antes de planificar nada.

## Estado del repositorio

- Repositorio propio en GitHub (`ElTecladoMagico/Instanta`), separado del repositorio de la memoria del TFG.
- La rama `deploy_needs` ya estaba integrada en `main` (PR #4).
- **Problemas de higiene encontrados y resueltos:**
  - La URL del remoto contenía un token de GitHub en texto plano (y caducado). Se quitó de la URL y se pasó a autenticar con `gh auth login`. Riesgo: cualquiera con acceso a `.git/config` tenía acceso a la cuenta.
  - 53 archivos aparecían como modificados solo por cambios de permisos. Se desactivó `core.fileMode` para que git ignore los permisos.
  - 176 archivos de `.cursor/` (skills de otros proyectos) estaban en el área de preparación. Se sacaron y se añadió `.cursor/` a `.gitignore`.
  - Había documentos de otros proyectos (`MCP-reuniones-meet/`, un plan de negocio de "NegotiaX" y un workflow de GitHub de otra organización). Se borraron.

## Estado del prototipo

Next.js 16 + Convex (base de datos y backend) + Clerk (login) + wagmi/viem (cartera), en Base Sepolia. Unas 930 líneas de lógica. Un comercio crea un botón, lo pega en su web y el comprador paga desde un iframe; un cron cada 5 s consulta el recibo de la transacción.

**Fallos graves encontrados** (detallados en [ADR-004](../decisions/004-modelo-de-amenazas.md)):

| Fallo | Dónde | Consecuencia |
|---|---|---|
| Cualquiera puede poner un pago en `confirmed` | `convex/payments.ts`, mutation pública `updatePayment` | Se puede "pagar" sin pagar |
| La verificación solo mira si la transacción tuvo éxito | `convex/blockchain/pollReceipt.ts` | Cualquier hash de una transacción ajena confirma el pago |
| El backend confía en el `userId` que manda el navegador | `createButton`, `updateUserWallet`, `getUser` | Un usuario puede actuar en nombre de otro |
| El id del pago se genera en el navegador con `Math.random()` | `public/button.js` | Ids predecibles |
| El widget cobra en ETH aunque el producto dice USDC | `src/app/widget/CheckoutFlow.tsx` (`parseEther`) | Importes y moneda incoherentes (ver [ADR-013](../decisions/013-eth-nativo-en-testnet.md)) |

## Por qué importa

Estos fallos no se arreglan con parches: el problema es que el diseño no separaba lo que decide el cliente de lo que decide el servidor. Por eso se decidió **no corregir el código de Convex**, sino construir el backend nuevo al lado y retirar el viejo al final ([ADR-002](../decisions/002-postgres-sql-en-vez-de-convex.md)).

## Para el TFG

- Sirve como "situación inicial" del capítulo de desarrollo y como motivación del modelo de amenazas.
- La lección: en un sistema de pagos, el cliente nunca debe decidir el estado, el importe ni el destino de un pago.
