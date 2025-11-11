(function() {
    // Este código corre inmediatamente cuando el script se carga
    // Lo envolvemos en una función para no contaminar el namespace global
    
    // Configuración
    const WIDGET_URL = 'http://localhost:3000/widget';
    
    // Esta función busca todos los botones de pago en la página
    function initializePayButtons() {
      // Buscar todos los elementos que tengan el atributo data-pay-amount
      const payButtons = document.querySelectorAll('[data-pay-amount]');
      
      console.log(`[SimplePay] Encontrados ${payButtons.length} botones de pago`);
      
      // Para cada botón encontrado, agregar funcionalidad
      payButtons.forEach(button => {
        // Leer la configuración del botón desde sus atributos
        const amount = button.getAttribute('data-pay-amount');
        const toAddress = button.getAttribute('data-pay-to');
        const currency = button.getAttribute('data-pay-currency') || 'USDC';
        const title = button.getAttribute('data-pay-title') || 'Completar Pago';
        
        // Validar que tengamos la info mínima necesaria
        if (!amount || !toAddress) {
          console.error('[SimplePay] Botón incompleto, faltan amount o to:', button);
          return;
        }
        
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
        
        console.log(`[SimplePay] Botón inicializado: $${amount} ${currency} → ${toAddress.slice(0, 8)}...`);
      });
    }
    
    // Esta función abre el modal de pago
    function openPaymentModal(amount, toAddress, currency, title) {
      console.log('[SimplePay] Abriendo modal de pago...');
      
      // Generar un payment ID único para este intento de pago
      const paymentId = 'pay_' + Math.random().toString(36).substr(2, 9);
      
      // Construir la URL del widget con todos los parámetros
      const widgetUrl = `${WIDGET_URL}?` + new URLSearchParams({
        amount: amount,
        to: toAddress,
        currency: currency,
        title: title,
        paymentId: paymentId
      }).toString();
      
      // Crear el overlay (fondo oscuro semi-transparente)
      const overlay = document.createElement('div');
      overlay.id = 'simplepay-overlay';
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
      overlay.style.animation = 'simplepay-fadein 0.2s ease-out';
      
      // Crear el iframe que contiene nuestro checkout
      const iframe = document.createElement('iframe');
      iframe.src = widgetUrl;
      iframe.style.width = '100%';
      iframe.style.maxWidth = '500px';
      iframe.style.height = '600px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '16px';
      iframe.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.3)';
      iframe.style.animation = 'simplepay-slideup 0.3s ease-out';
      
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
    
    // Esta función cierra el modal
    function closePaymentModal() {
      const overlay = document.getElementById('simplepay-overlay');
      if (overlay) {
        // Animar la salida
        overlay.style.animation = 'simplepay-fadeout 0.2s ease-out';
        setTimeout(() => {
          overlay.remove();
        }, 200);
      }
    }
    
    // Inyectar las animaciones CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes simplepay-fadein {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes simplepay-fadeout {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      @keyframes simplepay-slideup {
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
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializePayButtons);
    } else {
      // El DOM ya está listo, inicializar inmediatamente
      initializePayButtons();
    }
    
    // Hacer algunas funciones disponibles globalmente por si acaso
    window.SimplePay = {
      init: initializePayButtons,
      openModal: openPaymentModal,
      closeModal: closePaymentModal
    };
    
    console.log('[SimplePay] Script cargado exitosamente ✓');
  })();