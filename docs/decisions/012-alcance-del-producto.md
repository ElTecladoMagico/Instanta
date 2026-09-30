# ADR-012: Alcance del producto — qué se demuestra y qué queda fuera

**Fecha:** 30 de septiembre de 2026  
**Estado:** Propuesta  
**Contexto:** Instanta es a la vez un TFG y un producto que se quiere enseñar funcionando

---

## Problema

Hay más ideas que tiempo. Sin un alcance cerrado, el riesgo es llegar a la entrega con muchas piezas empezadas y ninguna demostración completa. Pero el producto no puede quedar reducido a una API sin cara: parte de lo que se quiere demostrar es que un comercio real podría usarlo.

## Opciones Evaluadas

### Opción A: Solo backend y API; interfaz mínima (descartada)

Técnicamente defendible, pero no demuestra el producto.

### Opción B: Todo lo del plan estratégico (varias redes, reembolsos, SDK, analítica…) (descartada)

No cabe en el tiempo y diluye la calidad de lo esencial.

### Opción C: Un recorrido completo de producto, bien terminado, con el resto como trabajo futuro (elegida)

## El recorrido que se demuestra

1. Un comercio entra en la landing, se registra y completa el alta (cartera de cobro).
2. En el dashboard crea una API key y un endpoint de webhook.
3. Crea un botón (payment link) y copia el snippet, **o** integra la API desde su tienda.
4. Un comprador paga en el checkout con su cartera.
5. El pago aparece como `succeeded` en el dashboard y el webhook llega a la tienda.

Para enseñar el punto 3 con API y el punto 5, se incluye una **tienda de ejemplo** (`examples/demo-store/`): una página de producto y un servidor de pocas líneas que crea el PaymentIntent, redirige al checkout y verifica la firma del webhook. Es lo que usaría un comercio real y sirve de guía de integración.

## Dentro del alcance

| Área | Contenido |
|---|---|
| Landing | Se mantiene; se actualiza el texto al nuevo producto (API + botón) |
| Dashboard | Pagos (lista, detalle, estado), API keys (crear, revocar), webhooks (endpoint, historial de eventos, reenviar), payment links, ajustes (cartera) |
| Modo test / live | Interruptor visible en el dashboard; solo test operativo (Base Sepolia) |
| Checkout | Página única, móvil, estados claros (conectar, pagar, confirmando, pagado, error, caducado) |
| Documentación | Página generada desde OpenAPI + guía rápida de integración |
| Tienda de ejemplo | `examples/demo-store/` |

## Fuera del alcance (trabajo futuro en la memoria)

- Base mainnet en producción (el modelo ya lo soporta: ADR-007).
- Varias redes y tokens.
- Direcciones de depósito por pago con CREATE2 (ADR-008).
- Comisión de la plataforma mediante un contrato repartidor; reembolsos.
- `Idempotency-Key`, claves publicables y SDK en npm (ADR-005).
- Demostrar la propiedad de la cartera con firma (SIWE); por ahora solo se valida el checksum de la dirección.
- Rate limiting, métricas, alta disponibilidad (ADR-003).

## Limpieza

Se eliminan del repo las piezas que no son de Instanta o dejan de usarse: `.cursor/` (skills y agentes ajenos al proyecto), `sync-data-ai-automations.yml`, `docs/MCP-reuniones-meet/`, `docs/business_plan_agent_negotiation.md`, `canvas-confetti`, `concurrently`, `convex/` y `src/app/widget/`.

## Congelación

El desarrollo tiene un máximo de **3 meses: del 1 de octubre al 31 de diciembre de 2026**. El 31 de diciembre se congelan las funcionalidades. A partir de ahí solo se corrigen errores, se hacen las mediciones (tiempos de confirmación, coste de gas frente a Stripe) y se redacta.

Las dos últimas semanas (que coinciden con Navidad) son colchón: si una fase se retrasa, se recorta alcance de la fase 8 (dashboard), nunca de la verificación ni de la seguridad. El calendario por semanas está en el [índice de ADR](README.md).

## Decisión

Construir y pulir el recorrido completo del comercio y el comprador, con dashboard, checkout, documentación y tienda de ejemplo. Todo lo demás se documenta como trabajo futuro.
