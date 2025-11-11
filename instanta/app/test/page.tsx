import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Página de Prueba - SimplePay",
};

export default function TestPage() {
  return (
    <>
      <Script src="/button.js" />
      <div
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "40px",
          maxWidth: "100wh",
          margin: "0 auto",
          backgroundColor: "#f9fafb",
        }}
      >
        <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>
          Mi Ebook Premium 📚
        </h1>
        <p style={{ color: '#666', marginBottom: '32px' }}>
            Aprende desarrollo web moderno con este completo ebook de 200 páginas
          </p>
          
          <div style={{
            backgroundColor: 'white',
            padding: '32px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px'
          }}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
              ¿Qué aprenderás?
            </h2>
            <ul style={{ lineHeight: '1.8', color: '#444' }}>
              <li>Next.js 14 y React Server Components</li>
              <li>TypeScript avanzado</li>
              <li>Integración con bases de datos</li>
              <li>Deployment en producción</li>
            </ul>
            
            <div style={{ marginTop: '32px' }}>
              <p style={{ fontSize: '18px', marginBottom: '16px' }}>
                <strong>Precio: $29 USDC</strong>
              </p>
              
              {/* Este es el botón mágico que nuestro script va a mejorar */}
              <button
                data-pay-amount="29"
                data-pay-to="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
                data-pay-currency="USDC"
                data-pay-title="Ebook: Desarrollo Web Moderno"
              >
                Comprar con USDC
              </button>
              
              <p style={{ fontSize: '12px', color: '#888', marginTop: '12px' }}>
                💡 Pago seguro en Base • Sin comisiones adicionales
              </p>
            </div>
          </div>
          
          <div style={{
            backgroundColor: '#eff6ff',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #3b82f6'
          }}>
            <h3 style={{ fontSize: '16px', marginBottom: '8px', color: '#1e40af' }}>
              💻 Para Desarrolladores
            </h3>
            <p style={{ fontSize: '14px', color: '#1e3a8a', lineHeight: '1.6' }}>
              Este botón se generó con solo 3 líneas de código. Mira el HTML de esta página para ver cómo.
            </p>
          </div>
        </div>
    </>
  );
}