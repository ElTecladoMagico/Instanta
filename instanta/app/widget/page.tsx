"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// Este componente interno maneja el checkout
// Lo separamos para poder usar useSearchParams con Suspense
function CheckoutContent() {
  // Leemos los parámetros de la URL
  // Por ejemplo: /widget?amount=29&to=0xabc...&currency=USDC
  const searchParams = useSearchParams();
  
  const amount = searchParams.get("amount") || "0";
  const toAddress = searchParams.get("to") || "";
  const currency = searchParams.get("currency") || "USDC";
  const paymentId = searchParams.get("paymentId") || "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Complete su pago
          </h2>
          <p className="text-gray-600 text-sm">
            Pago seguro en Base • Sin comisiones adicionales
          </p>
        </div>

        {/* Detalles del pago */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">Precio</span>
            <span className="text-xl font-semibold text-gray-900">
              ${amount} {currency}
            </span>
          </div>
          
          <div className="flex justify-between items-center text-sm mb-3">
            <span className="text-gray-500">Gas estimado</span>
            <span className="text-gray-700">~$0.40</span>
          </div>
          
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-blue-600">
                ${(parseFloat(amount) + 0.40).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Botón de acción - por ahora solo muestra el estado */}
        <button 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
        >
          Conectar Wallet
        </button>

        {/* Info de debug (la removeremos después) */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg text-xs">
          <p className="text-gray-600">Debug Info:</p>
          <p className="text-gray-800 font-mono">To: {toAddress.slice(0, 10)}...</p>
          <p className="text-gray-800 font-mono">Payment ID: {paymentId || "No ID"}</p>
        </div>
      </div>
    </div>
  );
}

// Componente principal con Suspense
// Suspense es necesario cuando usamos useSearchParams en Next.js
export default function WidgetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}