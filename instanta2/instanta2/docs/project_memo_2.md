# Memorando del Proyecto: Desarrollo del Sistema de Pagos "Instanta" - Fase 2

**Fecha:** 19 de noviembre de 2025
**Autor:** Pedro Gabriel Mantese Masegosa
**Asunto:** Continuación del desarrollo: Landing Page, Dashboard Completo y Experiencia de Usuario

---

## 1. Contexto y Continuidad

Este memorando documenta la segunda fase del desarrollo de Instanta, continuando desde donde terminó el primer ciclo. En ese punto, habíamos completado un sistema funcional de extremo a extremo con autenticación, creación de botones seguros y un widget de pago básico. El siguiente paso lógico era construir la experiencia completa del usuario: desde el primer contacto con el producto hasta la gestión de sus botones de pago.

---

## 2. Fase 6: Construcción de la Landing Page

### 2.1. Necesidad de una Primera Impresión Profesional

Una vez que el sistema técnico funcionaba, era crítico crear una landing page que comunicara el valor del producto de forma inmediata. El objetivo era que cualquier visitante entendiera en menos de 5 segundos qué es Instanta y por qué debería usarlo.

### 2.2. Diseño Modular y Componentización

Decidimos construir la landing page de forma modular usando componentes React separados. Esta decisión tenía múltiples beneficios:

- **Mantenibilidad**: Cada sección es independiente y fácil de modificar
- **Reutilización**: Componentes como `Navbar` y `Footer` pueden usarse en otras páginas
- **Colaboración**: Diferentes desarrolladores pueden trabajar en secciones diferentes sin conflictos

Creamos los siguientes componentes en `src/components/landing/`:

- **`Navbar.tsx`**: Barra de navegación superior con autenticación integrada
- **`Hero.tsx`**: Sección principal con mensaje de valor y CTAs
- **`HowItWorks.tsx`**: Explicación visual del proceso en 3 pasos
- **`Features.tsx`**: Destacado de características clave
- **`Footer.tsx`**: Pie de página con información legal y enlaces

### 2.3. Integración de Autenticación en la Landing

El `Navbar` integra directamente los componentes de Clerk (`SignInButton`, `SignedIn`, `SignedOut`, `UserButton`), lo que permite que los usuarios inicien sesión sin salir de la página principal. Esta decisión reduce la fricción: el usuario puede autenticarse mientras lee sobre el producto.

### 2.4. Smooth Scrolling y Experiencia de Usuario

Implementamos `scroll-behavior: smooth` en el CSS global para que los enlaces internos (como "How it Works" y "Features") naveguen suavemente por la página en lugar de hacer saltos bruscos. Este pequeño detalle mejora significativamente la percepción de calidad del producto.

---

## 3. Fase 7: Sistema de Dashboard y Gestión de Usuarios

### 3.1. Migración de Ruta Temporal a Arquitectura Escalable

La ruta inicial `/test/user` era funcional pero no escalable. Necesitábamos una arquitectura que soportara múltiples usuarios y fuera fácil de mantener. Implementamos rutas dinámicas usando el App Router de Next.js: `/dashboard/[userId]`.

Esta decisión arquitectónica nos permite:
- **Escalabilidad**: Cada usuario tiene su propia ruta única
- **Seguridad**: Podemos verificar que el usuario solo acceda a su propio dashboard
- **SEO futuro**: Si decidimos hacer dashboards públicos, la estructura ya está lista

### 3.2. Manejo de Parámetros Asíncronos en Next.js 16

Durante la implementación, encontramos un cambio importante en Next.js 16: los `params` en rutas dinámicas ahora son Promises y deben desenvueltos usando `React.use()`. Esto requirió ajustar el código:

```typescript
const { userId } = use(params);
```

Este cambio refleja la evolución de Next.js hacia un modelo más explícito de manejo de datos asíncronos, mejorando la claridad del código pero requiriendo adaptación.

### 3.3. Sistema de Onboarding para Nuevos Usuarios

Identificamos que los usuarios nuevos necesitaban configurar su wallet predeterminada antes de poder crear botones. En lugar de hacer esto opcional, decidimos hacerlo obligatorio en el primer uso. Esto garantiza que:

- Todos los botones creados tienen una dirección de destino válida
- El usuario no puede crear botones sin saber dónde recibirá los pagos
- La experiencia es guiada y clara desde el inicio

Creamos el componente `Onboarding.tsx` que:
- Valida que la dirección de wallet sea un formato Ethereum válido
- Guarda la wallet en el campo `defaultWallet` del usuario
- Se muestra automáticamente si el usuario no tiene `defaultWallet` configurado

### 3.4. Extensión del Schema: Campo `defaultWallet`

Agregamos el campo `defaultWallet: v.optional(v.string())` a la tabla `users` en el schema. Este campo es opcional porque:
- Los usuarios existentes no lo tienen inicialmente
- Permite migración gradual sin romper datos existentes
- Puede ser `null` hasta que el usuario complete el onboarding

### 3.5. Componente de Lista de Botones

Creamos `ButtonList.tsx` que muestra todos los botones creados por un usuario. Este componente:
- Usa la query `getUserButtons` que filtra por `userId`
- Muestra información esencial: título, monto, dirección de destino
- Permite copiar el código HTML del botón con un solo clic
- Se actualiza automáticamente cuando se crea un nuevo botón (gracias a la reactividad de Convex)

### 3.6. Formulario de Creación Mejorado

Mejoramos `CreateButtonForm.tsx` para que:
- Pre-llene automáticamente el campo `toAddress` con el `defaultWallet` del usuario
- Permita al usuario cambiar la dirección si necesita una diferente para un botón específico
- Valide los datos antes de enviar
- Muestre feedback inmediato al crear un botón exitosamente

---

## 4. Fase 8: Configuración de Perfil y Gestión de Wallet

### 4.1. Necesidad de Permitir Cambios Post-Onboarding

Aunque el onboarding captura la wallet inicial, los usuarios necesitan poder cambiarla más adelante. Por ejemplo, si cambian de wallet principal o quieren usar una diferente para propósitos específicos.

### 4.2. Componente de Configuración de Perfil

Creamos `ProfileSettings.tsx` que permite:
- Ver el email (solo lectura, gestionado por Clerk)
- Cambiar la wallet predeterminada con validación
- Mostrar mensajes de éxito/error claros
- Deshabilitar el botón "Save" si no hay cambios

Este componente se integra en el dashboard en la columna izquierda, debajo del formulario de creación de botones, manteniendo toda la configuración en un solo lugar.

### 4.3. Mutación `updateUserWallet`

Agregamos una nueva mutación en `convex/payments.ts` específicamente para actualizar la wallet del usuario. Separar esta funcionalidad de otras mutaciones mejora:
- **Claridad**: Cada mutación tiene una responsabilidad única
- **Mantenibilidad**: Cambios futuros solo afectan una función
- **Seguridad**: Podemos agregar validaciones específicas para esta operación

---

## 5. Fase 9: Flujo de Redirección y Navegación

### 5.1. Redirección Automática al Dashboard

Implementamos lógica en la landing page (`src/app/page.tsx`) para redirigir automáticamente a los usuarios autenticados a su dashboard. Sin embargo, rápidamente identificamos un problema: esta redirección impedía que los usuarios autenticados pudieran volver a la landing page haciendo clic en el logo.

### 5.2. Solución: Redirección Solo al Iniciar Sesión

La solución fue mover la redirección del `useEffect` en la landing page a los botones de autenticación de Clerk. Usamos `fallbackRedirectUrl` en los `SignInButton` para redirigir a `/auth-callback` después del login.

### 5.3. Página de Callback de Autenticación

Creamos `/auth-callback/page.tsx` que:
- Detecta si el usuario está autenticado usando `useUser()` de Clerk
- Redirige al dashboard del usuario si está autenticado
- Redirige a la landing page si no está autenticado
- Muestra un spinner mientras procesa la redirección

Esta página intermedia permite que:
- Los usuarios sean redirigidos al dashboard solo cuando inician sesión
- Los usuarios autenticados puedan navegar libremente a la landing page
- La experiencia sea fluida sin redirecciones inesperadas

---

## 6. Fase 10: Refinamiento de la Navegación

### 6.1. Navbar Específico para el Dashboard

Creamos `DashboardNavbar.tsx` separado del `Navbar` de la landing page porque:
- El dashboard no necesita los enlaces "How it Works" y "Features"
- Mantiene la navegación limpia y enfocada
- Permite evolucionar independientemente cada navbar

### 6.2. Actualización del Navbar de Landing

Modificamos el `Navbar` de la landing para que el enlace "Dashboard" use dinámicamente el `userId` del usuario autenticado, obtenido mediante `useUser()` de Clerk. Esto asegura que cada usuario siempre sea redirigido a su propio dashboard.

---

## 7. Decisiones Arquitectónicas Clave

### 7.1. Separación de Componentes por Contexto

Decidimos mantener componentes separados para landing (`src/components/landing/`) y dashboard (`src/components/dashboard/`) en lugar de componentes genéricos. Esta decisión:
- Mejora la organización del código
- Facilita el mantenimiento futuro
- Permite que cada contexto evolucione independientemente

### 7.2. Validación en el Cliente vs. Servidor

Implementamos validación de direcciones Ethereum en el cliente (usando regex) para dar feedback inmediato al usuario. Sin embargo, esta validación es complementaria, no sustitutiva de la validación del servidor. El servidor siempre debe validar los datos antes de guardarlos.

### 7.3. Estado de Carga y Experiencia del Usuario

En múltiples componentes (`DashboardPage`, `Onboarding`, `ProfileSettings`), implementamos estados de carga usando `useQuery` de Convex. Cuando `userInDb === undefined`, mostramos un spinner. Esto evita que los usuarios vean errores o contenido incorrecto mientras los datos se cargan.

---

## 8. Estado Actual del Proyecto

En este punto, Instanta tiene:

1. **Landing Page Completa**: Comunicación clara del valor del producto con diseño profesional
2. **Sistema de Dashboard**: Gestión completa de botones con interfaz intuitiva
3. **Onboarding Guiado**: Los nuevos usuarios son guiados paso a paso
4. **Configuración de Perfil**: Los usuarios pueden gestionar su información
5. **Navegación Fluida**: Redirecciones inteligentes que mejoran la experiencia
6. **Arquitectura Escalable**: Estructura preparada para crecimiento futuro

El sistema está listo para que los usuarios creen botones de pago y los integren en sus sitios web. La siguiente fase será implementar las funcionalidades críticas del MVP según el README.md: integración con contrato USDC, detección automática de pagos, y estimación de gas.

---

## 9. Lecciones Aprendidas y Consideraciones Futuras

### 9.1. Importancia de la Experiencia de Usuario

Durante esta fase, aprendimos que pequeños detalles como el smooth scrolling, estados de carga claros, y mensajes de error amigables tienen un impacto significativo en la percepción del producto. La simplicidad no significa descuidar estos detalles.

### 9.2. Evolución de Next.js

El cambio en Next.js 16 hacia `params` como Promise nos recordó la importancia de mantenerse actualizado con las mejores prácticas del framework. Adaptarse a estos cambios temprano evita problemas mayores más adelante.

### 9.3. Preparación para la Siguiente Fase

Con la experiencia de usuario completa, ahora podemos enfocarnos en las funcionalidades críticas del backend: integración con blockchain, detección automática de pagos, y optimización de la experiencia de pago. La base está sólida y lista para estas mejoras.

