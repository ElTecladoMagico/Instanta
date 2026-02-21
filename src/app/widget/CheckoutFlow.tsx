"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useEffect, useState, useRef } from "react";
import { useAccount, useConnect, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatGwei } from "viem";
import { useGasPrice } from "wagmi";
import { Loader2, Wallet, CheckCircle, AlertCircle, ExternalLink, Shield } from "lucide-react";
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

  const createPayment = useMutation(api.payments.createPayment);
  const updatePayment = useMutation(api.payments.updatePayment);

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const { data: gasPrice } = useGasPrice();

  const { data: ethHash, sendTransaction, isPending: isEthPending, error: txError } = useSendTransaction();
  const { isLoading: isEthConfirming, isSuccess: isEthConfirmed } = useWaitForTransactionReceipt({ hash: ethHash });

  const hash = ethHash;
  const isPending = isEthPending;
  const isConfirming = isEthConfirming;
  const isConfirmed = isEthConfirmed;

  const estimatedGasCost = gasPrice ? Number(formatGwei(gasPrice)) * 21000 / 1e9 : null;

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

  useEffect(() => {
    if (hash) {
      updatePayment({ paymentId, txHash: hash, status: "pending" });
    }
  }, [hash, paymentId, updatePayment]);

  const hasConfettiTriggered = useRef(false);
  useEffect(() => {
    if (isConfirmed && !hasConfettiTriggered.current) {
      hasConfettiTriggered.current = true;
      updatePayment({ paymentId, status: "confirmed" });

      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2E7D32', '#3949AB', '#00897B'],
        gravity: 0.8,
        scalar: 0.9,
        disableForReducedMotion: true,
      });
    }
  }, [isConfirmed, paymentId, updatePayment]);

  const handleConnect = () => {
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  };

  const handlePay = () => {
    if (!details) return;
    sendTransaction({
      to: details.toAddress as `0x${string}`,
      value: parseEther(details.amount.toString()),
    });
  };

  // Loading
  if (!details && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-surface rounded-3xl p-10 w-full max-w-md text-center border border-outline-variant shadow-elevation-2">
          <div className="w-16 h-16 bg-primary-container rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <p className="text-on-surface-variant font-medium">Loading payment details...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-surface rounded-3xl p-10 w-full max-w-md text-center border border-outline-variant shadow-elevation-2">
          <div className="w-16 h-16 bg-error-container rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-error" />
          </div>
          <p className="text-on-surface font-semibold text-lg mb-2">Something went wrong</p>
          <p className="text-on-surface-variant">{error}</p>
        </div>
      </div>
    );
  }

  // Success
  if (isConfirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-surface rounded-3xl p-10 w-full max-w-md text-center border border-outline-variant animate-scale-in shadow-elevation-3">
          <div className="w-20 h-20 bg-success-container rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-on-surface mb-2">Payment Complete</h1>
          <p className="text-on-surface-variant mb-6">Your transaction has been confirmed on the blockchain.</p>
          {hash && (
            <a
              href={`https://sepolia.basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 bg-surface-container hover:bg-surface-container-high text-primary rounded-full font-medium transition-colors border border-outline-variant"
            >
              <ExternalLink className="w-4 h-4" />
              View on Basescan
            </a>
          )}
        </div>
      </div>
    );
  }

  // Processing
  if (isPending || isConfirming) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-surface rounded-3xl p-10 w-full max-w-md text-center border border-outline-variant shadow-elevation-2">
          <div className="w-20 h-20 bg-primary-container rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
          <h1 className="text-xl font-bold text-on-surface mb-2">
            {isConfirming ? "Confirming Transaction..." : "Waiting for Approval"}
          </h1>
          <p className="text-on-surface-variant">
            {isConfirming
              ? "Please wait while the network confirms your payment."
              : "Please confirm the transaction in your wallet."}
          </p>
          {hash && (
            <div className="mt-6 px-4 py-3 bg-surface-container rounded-xl">
              <p className="text-xs text-outline mb-1">Transaction Hash</p>
              <p className="text-xs text-on-surface-variant font-mono break-all">
                {hash.slice(0, 16)}...{hash.slice(-12)}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main checkout
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-surface rounded-3xl w-full max-w-md overflow-hidden border border-outline-variant shadow-elevation-3">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant bg-surface-container-low">
          <h1 className="text-xl font-bold text-on-surface">{details!.title}</h1>
        </div>

        {/* Price section */}
        <div className="p-6">
          <div className="flex justify-between items-center py-4">
            <span className="text-on-surface-variant">Amount</span>
            <span className="text-2xl font-bold text-on-surface">
              {details!.amount} <span className="text-base font-medium text-primary">{details!.currency}</span>
            </span>
          </div>

          <div className="flex justify-between items-center py-4 border-t border-outline-variant">
            <span className="text-on-surface-variant">Network fee (est.)</span>
            <span className="text-on-surface-variant text-sm">
              {estimatedGasCost
                ? `~${estimatedGasCost.toFixed(6)} ETH`
                : <span className="md-skeleton inline-block w-20 h-4"></span>}
            </span>
          </div>

          <div className="flex justify-between items-center py-4 border-t-2 border-outline-variant mt-2">
            <span className="font-semibold text-on-surface">Total</span>
            <span className="text-xl font-bold text-on-surface">
              ~{(details!.amount + (estimatedGasCost || 0)).toFixed(6)} {details!.currency}
            </span>
          </div>
        </div>

        {/* Action section */}
        <div className="p-6 bg-surface-container-low border-t border-outline-variant">
          {txError && (
            <div className="mb-4 p-4 bg-error-container rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-error" />
              <p className="text-sm text-on-error-container">Transaction failed. Please try again.</p>
            </div>
          )}

          {!isConnected ? (
            <button
              onClick={handleConnect}
              className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary-light text-white font-semibold py-4 px-6 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 py-2 px-4 bg-success-container rounded-full">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span className="text-xs text-on-success-container font-mono">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
              <button
                onClick={handlePay}
                className="w-full bg-primary hover:bg-primary-light text-white font-semibold py-4 px-6 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                Pay {details!.amount} {details!.currency}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-surface-container border-t border-outline-variant">
          <p className="text-xs text-center text-outline flex items-center justify-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            Secure payment on Base &bull; Powered by Instanta
          </p>
        </div>
      </div>
    </div>
  );
}
