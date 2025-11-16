(function() {
    // Este código corre inmediatamente cuando el script se carga
    // Lo envolvemos en una función para no contaminar el namespace global
    
    // Configuración
    const WIDGET_URL = 'http://localhost:3000/widget';
    
    // Esta función busca todos los botones de pago en la página
    function initializePayButtons() {
      // Buscar todos los elementos que tengan el atributo data-pay-amount
      const payButtons = document.querySelectorAll('[data-pay-amount]');
      
      console.log(`[Instanta] Encontrados ${payButtons.length} botones de pago`);
      
      // Para cada botón encontrado, agregar funcionalidad
      payButtons.forEach(button => {
        // Leer la configuración del botón desde sus atributos
        const buttonId = button.getAttribute('data-pay-button-id'); // Puedo hacer que sólo con el ID se obtenga toda la información del botón para poder identificarlo en el backend
        const amount = button.getAttribute('data-pay-amount');
        const toAddress = button.getAttribute('data-pay-to');
        const currency = button.getAttribute('data-pay-currency') || 'USDC';
        const title = button.getAttribute('data-pay-title') || 'Completar Pago';
        
        // Validar que tengamos la info mínima necesaria
        if (!amount || !toAddress) {
          console.error('[Instanta] Botón incompleto, faltan amount o to:', button);
          return;
        }
        
        
        /***************************Estilos básicos del botón***************************/
        // Agregar estilos básicos al botón si no tiene ninguno
        // Esto asegura que siempre se vea decente
        if (!button.style.backgroundColor) {
          button.style.padding = '12px 24px';
          button.style.backgroundColor = '#0052FF';
          button.style.color = 'white';
          button.style.border = 'none';
          button.style.borderRadius = '8px';
          button.style.fontSize = '16px';
          button.style.fontWeight = '600';
          button.style.cursor = 'pointer';
          button.style.transition = 'all 0.2s';
        }
        
        // Agregar hover effect
        button.addEventListener('mouseenter', () => {
          button.style.transform = 'scale(1.02)';
          button.style.boxShadow = '0 4px 12px rgba(0, 82, 255, 0.3)';
        });
        
        button.addEventListener('mouseleave', () => {
          button.style.transform = 'scale(1)';
          button.style.boxShadow = 'none';
        });
        
        // Agregar el click handler que abre el modal
        button.addEventListener('click', (e) => {
          e.preventDefault(); // Prevenir comportamiento default del botón
          openPaymentModal(amount, toAddress, currency, title);
        });
        /***************************Estilos básicos del botón***************************/


        console.log(`[Instanta] Botón inicializado: $${amount} ${currency} → ${toAddress.slice(0, 8)}...`);
      });
    }
    

    /*************************** iFrame del widget con estilos ***************************/
    // Esta función abre el modal de pago
    function openPaymentModal(amount, toAddress, currency, title) {
      console.log('[Instanta] Abriendo modal de pago...');
      
      // Generar un payment ID único para este intento de pago
      const paymentId = 'pay_' + Math.random().toString(36).slice(2, 10);
      
      // Construir la URL del widget con todos los parámetros
      const widgetUrl = `${WIDGET_URL}?` + new URLSearchParams({
        buttonId: buttonId, // ID del botón que se hizo click para poder identificarlo en el backend
        amount: amount,
        to: toAddress,
        currency: currency,
        title: title,
        paymentId: paymentId
      }).toString();
      
      // Crear el overlay (fondo oscuro semi-transparente)
      const overlay = document.createElement('div');
      overlay.id = 'Instanta-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      overlay.style.backdropFilter = 'blur(4px)';
      overlay.style.zIndex = '999999';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.animation = 'Instanta-fadein 0.2s ease-out';
      
      // Crear el iframe que contiene nuestro checkout
      const iframe = document.createElement('iframe');
      iframe.src = widgetUrl;
      iframe.style.width = '100%';
      iframe.style.maxWidth = '500px';
      iframe.style.height = '600px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '16px';
      iframe.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.3)';
      iframe.style.animation = 'Instanta-slideup 0.3s ease-out';
      
      // Agregar el iframe al overlay
      overlay.appendChild(iframe);
      
      // Agregar el overlay al body
      document.body.appendChild(overlay);
      
      // Cerrar el modal si hacen click fuera del iframe
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closePaymentModal();
        }
      });
      
      // Cerrar con la tecla Escape
      document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
          closePaymentModal();
          document.removeEventListener('keydown', escapeHandler);
        }
      });
    }
    /*************************** iFrame del widget con estilos ***************************/

    /*************************** Cierre del modal ***************************/
    // Esta función cierra el modal
    function closePaymentModal() {
      const overlay = document.getElementById('Instanta-overlay');
      if (overlay) {
        // Animar la salida
        overlay.style.animation = 'Instanta-fadeout 0.2s ease-out';
        setTimeout(() => {
          overlay.remove();
        }, 200);
      }
    }
    /*************************** Cierre del modal ***************************/

    /*************************** Animaciones CSS ***************************/
    // Inyectar las animaciones CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes Instanta-fadein {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes Instanta-fadeout {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      @keyframes Instanta-slideup {
        from { 
          transform: translateY(20px);
          opacity: 0;
        }
        to { 
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    /*************************** Animaciones CSS ***************************/

    /*************************** Inicialización del modal ***************************/
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializePayButtons);
    } else {
      // El DOM ya está listo, inicializar inmediatamente
      initializePayButtons();
    }
    
    // Hacer algunas funciones disponibles globalmente por si acaso
    window.Instanta = {
      init: initializePayButtons,
      openModal: openPaymentModal,
      closeModal: closePaymentModal
    };
    /*************************** Inicialización del modal ***************************/

    console.log('[Instanta] Script cargado exitosamente ✓');
  })();