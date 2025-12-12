"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useEffect, useState, useRef } from "react";
import { useAccount, useConnect, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatGwei } from "viem";
import { useGasPrice } from "wagmi";
import { Loader2, Wallet, CheckCircle, AlertCircle } from "lucide-react";
import confetti from "canvas-confetti";

interface PaymentDetails {
  amount: number;
  toAddress: string;
  currency: string;
  title: string;
}

export function CheckoutFlow({ buttonId, paymentId }: { buttonId: string, paymentId: string }) {
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [error, setError] = useState<string>("");

  // Convex mutations
  const createPayment = useMutation(api.payments.createPayment);
  const updatePayment = useMutation(api.payments.updatePayment);

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  // Gas price estimation
  const { data: gasPrice } = useGasPrice();

  // For ETH payments
  const { data: ethHash, sendTransaction, isPending: isEthPending, error: txError } = useSendTransaction();
  const { isLoading: isEthConfirming, isSuccess: isEthConfirmed } = useWaitForTransactionReceipt({ hash: ethHash });

  // Unified state
  const hash = ethHash;
  const isPending = isEthPending;
  const isConfirming = isEthConfirming;
  const isConfirmed = isEthConfirmed;

  // Calculate estimated gas cost in ETH (21000 gas for simple ETH transfer)
  const estimatedGasCost = gasPrice ? Number(formatGwei(gasPrice)) * 21000 / 1e9 : null;

  // 1. On component mount, call createPayment to get secure details
  useEffect(() => {
    const getDetails = async () => {
      try {
        const paymentDetails = await createPayment({
          buttonId: buttonId as Id<"buttons">,
          paymentId,
        });
        setDetails(paymentDetails);
      } catch (e) {
        setError("Invalid payment configuration. Please try again.");
        console.error(e);
      }
    };
    getDetails();
  }, [createPayment, buttonId, paymentId]);

  // 2. When transaction is sent, update payment status to "pending"
  useEffect(() => {
    if (hash) {
      updatePayment({ paymentId, txHash: hash, status: "pending" });
    }
  }, [hash, paymentId, updatePayment]);

  // 3. When transaction is confirmed, update status to "confirmed" and trigger subtle confetti
  const hasConfettiTriggered = useRef(false);
  useEffect(() => {
    if (isConfirmed && !hasConfettiTriggered.current) {
      hasConfettiTriggered.current = true;
      updatePayment({ paymentId, status: "confirmed" });

      // Minimalistic confetti - subtle and not scammy
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#3b82f6', '#64748b'], // green, blue, slate
        gravity: 0.8,
        scalar: 0.9,
        disableForReducedMotion: true,
      });
    }
  }, [isConfirmed, paymentId, updatePayment]);

  // Handler for the "Connect Wallet" button
  const handleConnect = () => {
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  };

  // Handler for the "Pay" button
  const handlePay = () => {
    if (!details) return;

    sendTransaction({
      to: details.toAddress as `0x${string}`,
      value: parseEther(details.amount.toString()),
    });
  };

  // ========== UI STATES ==========

  // Loading state
  if (!details && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Loading payment details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="mt-4 text-gray-700 font-medium">Something went wrong</p>
          <p className="mt-2 text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (isConfirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Payment Complete</h1>
          <p className="mt-2 text-gray-500 text-sm">Your transaction has been confirmed.</p>
          {hash && (
            <a
              href={`https://sepolia.basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              View on Basescan →
            </a>
          )}
        </div>
      </div>
    );
  }

  // Processing state
  if (isPending || isConfirming) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
          <h1 className="mt-4 text-lg font-semibold text-gray-900">
            {isConfirming ? "Confirming transaction..." : "Waiting for approval..."}
          </h1>
          <p className="mt-2 text-gray-500 text-sm">
            {isConfirming
              ? "Please wait while the network confirms your payment."
              : "Please confirm the transaction in your wallet."}
          </p>
          {hash && (
            <p className="mt-4 text-xs text-gray-400 font-mono break-all">
              {hash.slice(0, 10)}...{hash.slice(-8)}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Main checkout state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-lg font-semibold text-gray-900">{details!.title}</h1>
        </div>

        {/* Price section */}
        <div className="p-6">
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-600">Amount</span>
            <span className="text-lg font-semibold text-gray-900">
              {details!.amount} {details!.currency}
            </span>
          </div>

          <div className="flex justify-between items-center py-3 border-t border-gray-100">
            <span className="text-gray-600">Network fee (est.)</span>
            <span className="text-gray-500 text-sm">
              {estimatedGasCost
                ? `~${estimatedGasCost.toFixed(6)} ETH`
                : "Calculating..."}
            </span>
          </div>

          <div className="flex justify-between items-center py-3 border-t border-gray-200 mt-2">
            <span className="font-medium text-gray-900">Total</span>
            <span className="text-xl font-bold text-gray-900">
              ~{(details!.amount + (estimatedGasCost || 0)).toFixed(6)} {details!.currency}
            </span>
          </div>
        </div>

        {/* Action section */}
        <div className="p-6 bg-gray-50 border-t border-gray-100">
          {txError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-sm text-red-600">Transaction failed. Please try again.</p>
            </div>
          )}

          {!isConnected ? (
            <button
              onClick={handleConnect}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-xl transition-colors"
            >
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 text-center font-mono">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
              <button
                onClick={handlePay}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Pay {details!.amount} {details!.currency}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-center text-gray-400">
            Secure payment on Base • Powered by Instanta
          </p>
        </div>
      </div>
    </div>
  );
}
