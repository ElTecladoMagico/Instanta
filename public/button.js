(function() {
    // Instanta's API lives wherever this script was loaded from
    // (e.g. https://instanta.scuda.es/button.js → https://instanta.scuda.es).
    const scriptSrc = document.currentScript && document.currentScript.src;
    const ORIGIN = scriptSrc ? new URL(scriptSrc).origin : window.location.origin;

    // Usage: <button data-instanta-link="pl_…">Pay</button>
    function initializePayButtons() {
      const payButtons = document.querySelectorAll('[data-instanta-link]');

      payButtons.forEach(button => {
        const linkId = button.getAttribute('data-instanta-link');

        if (!linkId) {
          console.error('[Instanta] Button is missing the data-instanta-link attribute.');
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
          openPaymentModal(linkId);
        });
        /*************************** Basic Button Styles ***************************/

      });
    }
    
    /*************************** iFrame Widget with Styles ***************************/
    // This function opens the payment modal
    async function openPaymentModal(linkId) {
      // The server creates the payment from the stored link (amount and wallet never come
      // from this page) and returns the checkout URL (ADR-010).
      let widgetUrl;
      try {
        const res = await fetch(`${ORIGIN}/v1/payment_links/${encodeURIComponent(linkId)}/checkout`, { method: 'POST' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        widgetUrl = (await res.json()).checkout_url;
      } catch (err) {
        console.error('[Instanta] Could not start the payment:', err);
        return;
      }

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
    
    window.Instanta = {
      init: initializePayButtons,
      openModal: openPaymentModal,
      closeModal: closePaymentModal
    };
    /*************************** Modal Initialization ***************************/
})();