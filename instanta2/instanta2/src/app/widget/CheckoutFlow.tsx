"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";

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
  const { data: hash, sendTransaction, isPending } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

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
        setError("Invalid Button ID. Could not fetch payment details.");
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

  // 3. When transaction is confirmed, update status to "confirmed"
  useEffect(() => {
    if (isConfirmed) {
      updatePayment({ paymentId, status: "confirmed" });
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

  // UI States
  if (!details) {
    return <div>{error || "Loading payment details..."}</div>;
  }

  if (isConfirmed) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center', backgroundColor: 'white', minHeight: '100vh' }}>
        <h1>Payment Confirmed!</h1>
        <p>Your transaction has been successfully processed.</p>
        {hash && <p style={{ fontSize: '12px', wordBreak: 'break-all' }}>TxHash: {hash}</p>}
      </div>
    );
  }

  if (isPending || isConfirming) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center', backgroundColor: 'white', minHeight: '100vh' }}>
        <h1>Processing Payment...</h1>
        <p>{isConfirming ? "Waiting for blockchain confirmation..." : "Please confirm in your wallet."}</p>
        {hash && <p style={{ fontSize: '12px', wordBreak: 'break-all' }}>TxHash: {hash}</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center', backgroundColor: 'white', minHeight: '100vh' }}>
      <h1>{details.title}</h1>
      <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '20px 0' }}>
        {details.amount} {details.currency}
      </p>
      
      {!isConnected ? (
        <button 
          onClick={handleConnect}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          Connect Wallet
        </button>
      ) : (
        <div>
          <p style={{ fontSize: '12px', wordBreak: 'break-all' }}>Connected: {address}</p>
          <button 
            onClick={handlePay}
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', marginTop: '10px' }}
          >
            Pay Now
          </button>
        </div>
      )}
    </div>
  );
}
