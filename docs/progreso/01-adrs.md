# 01 · Decisiones de arquitectura (ADR 002–012)

**Fecha:** 30/09/2026

## Qué se hizo

Se escribieron once ADR (*Architecture Decision Records*) en [`docs/decisions/`](../decisions/README.md), siguiendo el formato del ADR-001 que ya existía: problema, opciones evaluadas (con el motivo de cada descarte) y decisión. Todos quedaron en estado "Propuesta" y pasan a "Aceptada" al implementarse.

## Por qué ADRs

- Obligan a escribir las alternativas descartadas, que es lo que un tribunal pregunta ("¿por qué no X?").
- Son la fuente directa del capítulo de diseño.
- Separan las decisiones (estables) del diario de progreso (este directorio), que cuenta cómo se ejecutan.

## Decisiones principales

| ADR | Decisión | Motivo en una frase |
|---|---|---|
| 002 | PostgreSQL con SQL a mano en vez de Convex | La base de datos hace cumplir las reglas (`UNIQUE`, `CHECK`, transacciones) y SQL se enseña y se defiende mejor que un servicio propietario |
| 003 | Un monolito Next.js + un proceso worker, en una VPS con Docker Compose | Un solo programa es más fácil de entender; la VPS no tiene los límites de Vercel para tareas en segundo plano |
| 004 | Modelo de amenazas antes de programar | Los fallos del prototipo venían de no haber pensado quién ataca qué |
| 005 | API REST tipo Stripe, escrita primero en OpenAPI | Es lo que un comercio real ya conoce; escribir el contrato antes obliga a cerrar el diseño |
| 006 | Clerk para personas, API keys propias para máquinas | La autenticación de usuarios no es la aportación del TFG; las API keys sí tienen interés técnico |
| 007 | Dinero como entero en unidades mínimas; estados con `UPDATE … WHERE status = …` | Sin errores de redondeo; sin condiciones de carrera y sin librerías |
| 008 | Verificación on-chain como función pura sobre el recibo | Se prueba sin red y se explica fácilmente |
| 009 | Webhooks con patrón *outbox* en Postgres y firma HMAC | Un aviso no se pierde aunque el servidor caiga; no hace falta Redis |
| 010 | Un único checkout; el botón embebible crea un pago en el servidor | Un solo flujo que mantener y asegurar |
| 011 | Tests con `node:test` y CI en GitHub Actions | Cero dependencias nuevas |
| 012 | Alcance del producto y calendario de 3 meses | Un recorrido completo bien terminado vale más que muchas piezas a medias |

## Calendario

Desarrollo del 1 de octubre al 31 de diciembre de 2026, con congelación de funcionalidades el 31 de diciembre. Las dos últimas semanas son colchón; si algo se retrasa, se recorta del dashboard, nunca de la verificación ni de la seguridad. Detalle por semanas en el [índice de ADR](../decisions/README.md).

## Criterio general: lo más simple que funcione

En cada decisión se eligió la opción con menos piezas que cumpliera los requisitos: sin ORM, sin Redis, sin microservicios, sin librería de colas, sin framework de tests. Cuando algo se deja fuera, el ADR dice cuándo haría falta añadirlo. Así el sistema cabe en la cabeza de una persona y cada parte se puede defender.

## Commits

- `5df1294` docs(adr): add ADRs 002-012 and 3-month roadmap
