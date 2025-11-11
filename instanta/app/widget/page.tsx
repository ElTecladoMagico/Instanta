"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function CheckoutContent() {
  const searchParams = useSearchParams();
  
  const amount = searchParams.get("amount") || "0";
  const toAddress = searchParams.get("to") || "";
  const currency = searchParams.get("currency") || "USDC";
  const paymentId = searchParams.get("paymentId") || "";
  const title = searchParams.get("title") || "Completar Pago";
  const merchantId = searchParams.get("merchantId") || "";
  const callbackUrl = searchParams.get("callbackUrl") || "";

  // Mutation para crear el pago
  const createPayment = useMutation(api.payments.create);
  
  // Query para leer el pago en tiempo real
  const payment = useQuery(api.payments.get, { paymentId });

  // Crear el pago cuando el modal se monta
  useEffect(() => {
    if (paymentId && amount && toAddress && !payment) {
      createPayment({
        paymentId,
        amount: parseFloat(amount),
        currency,
        toAddress,
        merchantId,
        callbackUrl,
      });
    }
  }, [paymentId, amount, toAddress, currency, payment, createPayment, merchantId, callbackUrl]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {title}
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

        {/* Estado del pago */}
        {payment && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Estado: <span className="font-semibold">{payment.status}</span>
            </p>
          </div>
        )}

        {/* Botón de acción */}
        <button 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
        >
          Conectar Wallet
        </button>

        {/* Footer con info de seguridad */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            🔒 Conexión segura • Tus fondos nunca salen de tu wallet hasta que apruebes la transacción
          </p>
        </div>
      </div>
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}