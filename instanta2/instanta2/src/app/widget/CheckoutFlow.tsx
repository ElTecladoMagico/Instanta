"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useSendTransaction, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, parseUnits } from "viem";
import { ERC20_ABI } from "../../../lib/usdc/abi";
import { USDC_CONTRACT_ADDRESS, USDC_DECIMALS } from "../../../lib/usdc/contract";

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
  
  // For ETH payments
  const { data: ethHash, sendTransaction, isPending: isEthPending } = useSendTransaction();
  const { isLoading: isEthConfirming, isSuccess: isEthConfirmed } = useWaitForTransactionReceipt({ hash: ethHash });
  
  // For USDC payments
  const { writeContract, data: usdcHash, isPending: isUsdcPending } = useWriteContract();
  const { isLoading: isUsdcConfirming, isSuccess: isUsdcConfirmed } = useWaitForTransactionReceipt({ hash: usdcHash });
  
  // Unified hash and status (works for both ETH and USDC)
  const hash = ethHash || usdcHash;
  const isPending = isEthPending || isUsdcPending;
  const isConfirming = isEthConfirming || isUsdcConfirming;
  const isConfirmed = isEthConfirmed || isUsdcConfirmed;

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
    
    // TODO: Future versions will support USDC and other tokens
    // For now, we only support ETH for simplicity
    const isUSDC = details.currency.toUpperCase() === "USDC";
    
    if (isUSDC) {
      // USDC support coming in future versions
      // For now, send as ETH
      setError("USDC is not yet supported. Please use ETH.");
      return;
    }
    
    // Send ETH (native currency)
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
