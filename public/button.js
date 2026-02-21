(function() {
    // Configuration
    const WIDGET_URL = 'http://localhost:3000/widget';
    
    // This function finds all payment buttons on the page
    function initializePayButtons() {
      // Look for all elements that have our new, secure attribute
      const payButtons = document.querySelectorAll('[data-instanta-button-id]');
      
      console.log(`[Instanta] Found ${payButtons.length} payment buttons`);
      
      payButtons.forEach(button => {
        // Read the secure button ID from its attribute
        const buttonId = button.getAttribute('data-instanta-button-id');
        
        // Validate that we have the button ID
        if (!buttonId) {
          console.error('[Instanta] Button is missing the data-instanta-button-id attribute:', button);
          return;
        }
        
        /*************************** Basic Button Styles ***************************/
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
        
        button.addEventListener('mouseenter', () => {
          button.style.transform = 'scale(1.02)';
          button.style.boxShadow = '0 4px 12px rgba(0, 82, 255, 0.3)';
        });
        
        button.addEventListener('mouseleave', () => {
          button.style.transform = 'scale(1)';
          button.style.boxShadow = 'none';
        });
        
        // Add the click handler that opens the modal
        button.addEventListener('click', (e) => {
          e.preventDefault(); // Prevent default button behavior
          // Pass only the secure buttonId to the modal function
          openPaymentModal(buttonId);
        });
        /*************************** Basic Button Styles ***************************/

        console.log(`[Instanta] Initialized button with ID: ${buttonId}`);
      });
    }
    
    /*************************** iFrame Widget with Styles ***************************/
    // This function opens the payment modal
    function openPaymentModal(buttonId) {
      console.log('[Instanta] Opening payment modal for button:', buttonId);
      
      // Generate a unique payment ID for this payment attempt
      const paymentId = 'pay_' + Math.random().toString(36).slice(2, 11);
      
      // Construct the widget URL with only the secure parameters
      const widgetUrl = `${WIDGET_URL}?` + new URLSearchParams({
        buttonId: buttonId, // The secure ID of the button
        paymentId: paymentId  // The temporary ID for this specific transaction
      }).toString();
      
      // Create the overlay (dark semi-transparent background)
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
      
      // Create the iframe that contains our checkout
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
    /*************************** iFrame Widget with Styles ***************************/

    /*************************** Modal Closing ***************************/
    function closePaymentModal() {
      const overlay = document.getElementById('Instanta-overlay');
      if (overlay) {
        overlay.style.animation = 'Instanta-fadeout 0.2s ease-out';
        setTimeout(() => {
          overlay.remove();
        }, 200);
      }
    }
    /*************************** Modal Closing ***************************/

    /*************************** CSS Animations ***************************/
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
    /*************************** CSS Animations ***************************/

    /*************************** Modal Initialization ***************************/
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
    /*************************** Modal Initialization ***************************/

    console.log('[Instanta] Script loaded successfully ✓');
})();