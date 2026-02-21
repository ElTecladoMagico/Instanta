# Memorando del Proyecto: Desarrollo del Sistema de Pagos "Instanta"

**Fecha:** 16 de noviembre de 2025
**Autor:** Pedro Gabriel Mantese Masegosa
**Asunto:** Resumen del ciclo de desarrollo, decisiones de arquitectura y estado actual del proyecto de botones de pago de Instanta.

## 1. Objetivo del Proyecto

El objetivo principal de este proyecto era desarrollar un sistema que permitiera a cualquier usuario (en adelante, "comerciante") crear e integrar fácilmente botones de pago de criptomonedas en sus sitios web. Los requisitos clave eran la **simplicidad** de integración para el comerciante y la **máxima seguridad** en el procesamiento de las transacciones.

---

## 2. Fase Inicial: El Prototipo y el Descubrimiento de una Vulnerabilidad Crítica

Comenzamos con un prototipo funcional basado en un único script de JavaScript, `button.js`.

### 2.1. Funcionamiento del Prototipo Inicial

El script inicial estaba diseñado para ser muy fácil de usar. Un comerciante simplemente añadía atributos `data-*` a un elemento `<button>` en su HTML:

```html
<!-- Versión Inicial Insegura -->
<button 
  data-pay-amount="100.00"
  data-pay-to="0xDireccionDelComerciante"
  data-pay-currency="USDC"
>
  Pagar Ahora
</button>
```

El script `button.js` buscaba estos botones, les aplicaba estilos y, al hacer clic, abría un `iframe` (modal de pago) pasando todos estos atributos directamente en la URL al widget de pago.

### 2.2. La Falla de Seguridad: Confianza en el Cliente

Rápidamente identificamos una vulnerabilidad de seguridad crítica en este enfoque: **el sistema confiaba ciegamente en los datos proporcionados por el cliente (el navegador)**. Un usuario malintencionado podría simplemente usar las herramientas de desarrollador de su navegador para cambiar el `data-pay-amount` de "100.00" a "0.01" antes de hacer clic. El backend procesaría el pago por un céntimo, pero el comerciante creería que ha recibido cien dólares. Esta es una de las vulnerabilidades más fundamentales en el desarrollo web y era imperativo solucionarla.

---

## 3. Fase de Re-arquitectura: Hacia un Backend Seguro

La solución a la vulnerabilidad fue invertir el flujo de confianza. En lugar de que el cliente le diga al servidor cuánto cobrar, el servidor debe ser la única fuente de verdad.

### 3.1. Diseño del Esquema de la Base de Datos

Introdujimos una base de datos (utilizando Convex) y diseñamos un esquema simple pero robusto en `convex/schema.ts` con tres tablas interconectadas:

1.  **`users`**: Almacena la información de nuestros comerciantes (ej. ID de Clerk, email).
2.  **`buttons`**: El corazón de la nueva arquitectura. Esta tabla almacena de forma segura toda la información sensible de un botón de pago (`amount`, `toAddress`, `currency`, `title`) y lo asocia a un `userId`.
3.  **`payments`**: Registra cada intento de transacción, vinculándolo a un `buttonId` y un `userId`, y rastreando su estado (`pending`, `confirmed`, `failed`).

Esta estructura asegura que los detalles críticos del pago nunca se exponen en el frontend.

### 3.2. Desarrollo de Mutaciones Seguras en el Backend

En `convex/payments.ts`, creamos las funciones del backend que harían cumplir esta nueva lógica:

*   `createButton`: Una mutación que permite a un comerciante autenticado crear un nuevo botón, guardando sus detalles de forma segura en la tabla `buttons`.
*   `createPayment`: El punto clave. El widget del frontend llama a esta función enviando únicamente el `buttonId` (que es seguro de exponer). La mutación busca los detalles del botón en la base de datos, crea un nuevo registro de pago y devuelve los detalles seguros (`amount`, `toAddress`) al widget.
*   `updatePayment`: Permite al widget actualizar el estado de un pago (ej. añadir el hash de la transacción, cambiar el estado a "confirmado") a medida que progresa.

---

## 4. Fase de Implementación: Autenticación y Flujo de Usuario

Con el backend seguro en su lugar, construimos la interfaz de usuario para los comerciantes.

### 4.1. Integración de Clerk para la Autenticación

Elegimos Clerk para gestionar el registro y la autenticación de usuarios por su simplicidad y su excelente integración con Next.js y Convex. Configuramos los `Providers` necesarios, las variables de entorno y el `middleware` para proteger las rutas.

### 4.2. Sincronización de Usuarios y Panel de Control

Implementamos un flujo en el que, la primera vez que un usuario inicia sesión a través de Clerk, se crea automáticamente un registro correspondiente en nuestra tabla `users` de Convex.

Creamos una ruta protegida (`/test/user`) que actúa como un panel de control simple. En esta página, un usuario autenticado puede:
*   Ver un formulario para crear nuevos botones de pago.
*   Al crear un botón, recibir el `buttonId` único y un fragmento de código HTML listo para copiar y pegar en su propio sitio web.

---

## 5. Fase Final: Construcción del Widget de Pago y Pruebas

El último paso fue construir el widget de pago que se carga en el `iframe` y refinar el script `button.js`.

### 5.1. Refactorización de `button.js`

Reescribimos completamente el `public/button.js`. Ahora es un script "tonto" y seguro:
*   Su única función es buscar botones con el atributo `data-instanta-button-id`.
*   Al hacer clic, abre el `iframe` apuntando a `/widget`, pasando únicamente el `buttonId` en la URL. Ya no maneja ninguna información sensible.

### 5.2. El Widget de Pago con Wagmi

Creamos la ruta `/widget` en nuestra aplicación. Para la interacción con la blockchain, elegimos `wagmi` por ser el estándar de la industria para React, ofreciendo una experiencia de desarrollo simple a través de hooks (`useAccount`, `useSendTransaction`, etc.) y una gestión de estado y caché muy eficiente.

El componente `CheckoutFlow.tsx` orquesta todo el proceso de pago:
1.  Recibe el `buttonId` de la URL.
2.  Llama a la mutación `createPayment` para obtener los detalles seguros del pago.
3.  Muestra los detalles al usuario y gestiona la conexión con su wallet (MetaMask).
4.  Inicia la transacción en la blockchain (configurada para la red de pruebas **Base Sepolia**).
5.  Llama a `updatePayment` para mantener la base de datos sincronizada con el estado de la transacción.

### 5.3. Depuración y Pruebas

Durante las pruebas, nos encontramos y solucionamos un error de "React Hydration Mismatch". La causa era una anidación de HTML inválida (una etiqueta `<body>` dentro de otra) entre el layout raíz y el layout del widget. Lo solucionamos eliminando la etiqueta `<body>` del layout del widget y aplicando los estilos necesarios directamente en el componente.

Finalmente, establecimos un flujo de pruebas de extremo a extremo que simula con precisión el caso de uso real: crear un botón en el panel de control, copiar el fragmento de código HTML en un archivo local y verificar que el flujo de pago funciona como se espera.

## 6. Estado Actual del Proyecto

En este punto, el proyecto es un sistema de pagos de extremo a extremo, funcional, seguro y comprobable. Cumple con los objetivos iniciales de simplicidad de integración y máxima seguridad, utilizando una arquitectura moderna y robusta con Next.js, Convex, Clerk y Wagmi.
