"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount, useConnect, useDisconnect, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { Wallet, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { parseEther } from "viem";

export function CheckoutModal() {
  const searchParams = useSearchParams();
  
  const amount = searchParams.get("amount") || "0";
  const toAddress = searchParams.get("to") as `0x${string}`;
  const currency = searchParams.get("currency") || "ETH";
  const paymentId = searchParams.get("paymentId") || "";
  const title = searchParams.get("title") || "Completar Pago";
  const merchantId = searchParams.get("merchantId") || "";
  const callbackUrl = searchParams.get("callbackUrl") || "";

  // Estado local
  const [estimatedGas, setEstimatedGas] = useState(0.0002);
  const [error, setError] = useState<string>("");

  // Hooks de Convex
  const createPayment = useMutation(api.payments.create);
  const updatePayment = useMutation(api.payments.update);
  const payment = useQuery(api.payments.get, { paymentId });

  // Hooks de wagmi
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  
  const { 
    data: hash,
    isPending: isSending, 
    sendTransaction,
    error: txError 
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ 
      hash,
    });

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

  // Actualizar cuando obtenemos el hash
  useEffect(() => {
    if (hash && payment) {
      updatePayment({
        paymentId,
        txHash: hash,
        status: "pending_confirmation",
      });
    }
  }, [hash, payment, paymentId, updatePayment]);

  // Actualizar cuando se confirma
  useEffect(() => {
    if (isConfirmed && payment) {
      updatePayment({
        paymentId,
        status: "confirmed",
        completedAt: Date.now(),
      });
    }
  }, [isConfirmed, payment, paymentId, updatePayment]);

  // Manejar errores
  useEffect(() => {
    if (txError) {
      setError(txError.message);
      if (payment) {
        updatePayment({
          paymentId,
          status: "failed",
        });
      }
    }
  }, [txError, payment, paymentId, updatePayment]);

  const handleConnect = () => {
    const connector = connectors[0];
    if (connector) {
      connect({ connector });
    }
  };

  const handlePay = () => {
    if (!isConnected || !address) {
      setError("Por favor conecta tu wallet primero");
      return;
    }

    setError("");
    
    sendTransaction({
      to: toAddress,
      value: parseEther(amount),
    });
  };

  const total = parseFloat(amount) + estimatedGas;
  const isProcessing = isSending || isConfirming;
  const isComplete = isConfirmed && payment?.status === "confirmed";

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

        {/* Pantalla de éxito */}
        {isComplete ? (
          <div className="text-center py-8">
            <div className="mb-4 flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Pago Confirmado!
            </h3>
            <p className="text-gray-600 mb-4">
              Tu transacción se completó exitosamente
            </p>
            {hash && (
              
                href={`https://sepolia.basescan.org/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Ver en Basescan →
              </a>
            )}
          </div>
        ) : (
          <>
            {/* Detalles del pago */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-600">Precio</span>
                <span className="text-xl font-semibold text-gray-900">
                  {amount} {currency}
                </span>
              </div>
              
              <div className="flex justify-between items-center text-sm mb-3">
                <span className="text-gray-500">Gas estimado</span>
                <span className="text-gray-700">~{estimatedGas.toFixed(4)} ETH</span>
              </div>
              
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {total.toFixed(4)} ETH
                  </span>
                </div>
              </div>
            </div>

            {/* Wallet conectada */}
            {isConnected && address && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">
                      Wallet Conectada
                    </p>
                    <p className="text-xs text-green-600 font-mono">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="text-xs text-green-700 hover:text-green-900 underline"
                >
                  Cambiar
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Estado de procesamiento */}
            {isProcessing && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">
                    {isSending ? "Enviando transacción..." : "Esperando confirmación..."}
                  </p>
                  <p className="text-xs text-blue-600">
                    Esto puede tomar unos segundos
                  </p>
                </div>
              </div>
            )}

            {/* Botón de acción */}
            {!isConnected ? (
              <button 
                onClick={handleConnect}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <Wallet className="w-5 h-5" />
                Conectar Wallet
              </button>
            ) : (
              <button 
                onClick={handlePay}
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Confirmar Pago
                  </>
                )}
              </button>
            )}
          </>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            🔒 Conexión segura • Tus fondos nunca salen de tu wallet hasta que apruebes la transacción
          </p>
        </div>
      </div>
    </div>
  );
}