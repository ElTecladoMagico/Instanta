"use client";

// Flujo de pago del comprador. Toda la lógica de negocio está en el servidor; esta página solo:
// 1) pide los datos del pago, 2) conecta la cartera y cambia a la red correcta, 3) envía la transacción,
// 4) manda el hash al servidor y 5) consulta el estado mientras se confirma.
import { useCallback, useEffect, useState } from "react";
import { useAccount, useConnect, useSendTransaction, useSwitchChain, useWriteContract } from "wagmi";
import { AlertCircle, CheckCircle, ExternalLink, Loader2, Shield, Wallet } from "lucide-react";
import { ERC20_ABI } from "../../../../lib/usdc/abi";
import { explorerTxUrl, formatAmount } from "../../../../lib/format";

type Session = {
  id: string;
  amount: string;
  currency: "usdc" | "eth";
  status: "requires_payment" | "processing" | "succeeded" | "failed" | "canceled" | "expired";
  failure_code: string | null;
  pay_to: `0x${string}`;
  chain_id: 84532 | 8453;
  token_address: `0x${string}` | null;
  merchant_name: string;
  description: string | null;
  tx_hash: string | null;
  return_url: string | null;
};

const FAILURE_TEXT: Record<string, string> = {
  reverted: "The transaction was reverted by the network.",
  wrong_recipient: "The transaction did not pay this merchant.",
  wrong_token: "The transaction used a different token.",
  amount_mismatch: "The amount received is lower than the amount due.",
  tx_too_old: "The transaction is older than this payment.",
};

export function PayFlow({ secret }: { secret: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [unsentHash, setUnsentHash] = useState<string | null>(null);

  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  const load = useCallback(async () => {
    const res = await fetch(`/v1/checkout/${secret}`);
    if (res.ok) setSession(await res.json());
    else setNotFound(true);
  }, [secret]);

  useEffect(() => {
    load();
  }, [load]);

  // Mientras se confirma en la cadena, se consulta cada 3 s: el servidor lo comprueba en cada consulta (ADR-008).
  useEffect(() => {
    if (session?.status !== "processing") return;
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [session?.status, load]);

  // Manda el hash al servidor. Si falla (p. ej. sin conexión), se guarda para reintentarlo:
  // la transacción ya está en la cadena y no hay que pagar otra vez.
  async function submit(txHash: string) {
    setUnsentHash(txHash);
    const res = await fetch(`/v1/checkout/${secret}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tx_hash: txHash }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error?.message ?? "Could not register the payment.");
    setUnsentHash(null);
    setSession(body);
  }

  async function pay() {
    if (!session) return;
    setPaying(true);
    setError("");
    try {
      if (chainId !== session.chain_id) await switchChainAsync({ chainId: session.chain_id });
      const amount = BigInt(session.amount);
      const txHash =
        session.currency === "eth"
          ? await sendTransactionAsync({ to: session.pay_to, value: amount, chainId: session.chain_id })
          : await writeContractAsync({
              address: session.token_address!,
              abi: ERC20_ABI,
              functionName: "transfer",
              args: [session.pay_to, amount],
              chainId: session.chain_id,
            });
      await submit(txHash);
    } catch (err) {
      setError(err instanceof Error ? err.message.split("\n")[0] : "Something went wrong.");
    } finally {
      setPaying(false);
    }
  }

  async function retrySubmit() {
    setError("");
    try {
      await submit(unsentHash!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register the payment.");
    }
  }

  if (notFound) return <Card icon={<AlertCircle className="w-10 h-10 text-error" />} title="Payment not found" text="This payment link does not exist." />;
  if (!session) return <Card icon={<Loader2 className="w-10 h-10 animate-spin text-primary" />} title="Loading payment…" />;

  const amount = formatAmount(session.amount, session.currency);
  const txLink = session.tx_hash && (
    <a href={explorerTxUrl(session.chain_id, session.tx_hash)} target="_blank" rel="noopener noreferrer"
       className="inline-flex items-center gap-2 mt-6 text-primary font-medium">
      <ExternalLink className="w-4 h-4" /> View on Basescan
    </a>
  );

  if (session.status === "succeeded") {
    return (
      <Card icon={<CheckCircle className="w-10 h-10 text-success" />} title="Payment complete"
            text={`${amount} paid to ${session.merchant_name}.`}>
        {txLink}
        {session.return_url && (
          <a href={session.return_url} target="_top" className="block mt-4 text-primary font-medium">Back to the store</a>
        )}
      </Card>
    );
  }
  if (session.status === "processing") {
    return (
      <Card icon={<Loader2 className="w-10 h-10 animate-spin text-primary" />} title="Confirming on the blockchain…"
            text="This usually takes a few seconds. You can keep this page open.">
        {txLink}
      </Card>
    );
  }
  if (session.status === "failed") {
    return (
      <Card icon={<AlertCircle className="w-10 h-10 text-error" />} title="Payment not valid"
            text={FAILURE_TEXT[session.failure_code ?? ""] ?? "The transaction could not be verified."}>
        {txLink}
      </Card>
    );
  }
  if (session.status === "expired" || session.status === "canceled") {
    return <Card icon={<AlertCircle className="w-10 h-10 text-error" />} title={`Payment ${session.status}`}
                 text="Ask the merchant for a new payment link." />;
  }

  // requires_payment
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-surface rounded-3xl w-full max-w-md overflow-hidden border border-outline-variant shadow-elevation-3">
        <div className="p-6 border-b border-outline-variant bg-surface-container-low">
          <p className="text-sm text-on-surface-variant">{session.merchant_name}</p>
          <h1 className="text-xl font-bold text-on-surface">{session.description ?? "Payment"}</h1>
        </div>
        <div className="p-6 flex justify-between items-center">
          <span className="text-on-surface-variant">Amount</span>
          <span className="text-2xl font-bold text-on-surface">{amount}</span>
        </div>
        <div className="p-6 bg-surface-container-low border-t border-outline-variant space-y-4">
          {error && (
            <div className="p-4 bg-error-container rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-error shrink-0" />
              <p className="text-sm text-on-error-container break-words">{error}</p>
            </div>
          )}
          {unsentHash ? (
            <button onClick={retrySubmit} className="w-full bg-primary text-white font-semibold py-4 rounded-full">
              Your payment was sent. Retry confirming it
            </button>
          ) : !isConnected ? (
            <button onClick={() => connect({ connector: connectors[0] })} disabled={connecting || connectors.length === 0}
                    className="w-full flex items-center justify-center gap-3 bg-primary text-white font-semibold py-4 rounded-full disabled:opacity-60">
              <Wallet className="w-5 h-5" /> {connectors.length === 0 ? "No browser wallet found" : "Connect wallet"}
            </button>
          ) : (
            <>
              <p className="text-xs text-center text-on-surface-variant font-mono">
                {address?.slice(0, 6)}…{address?.slice(-4)}
              </p>
              <button onClick={pay} disabled={paying}
                      className="w-full bg-primary text-white font-semibold py-4 rounded-full text-lg disabled:opacity-60">
                {paying ? "Confirm in your wallet…" : `Pay ${amount}`}
              </button>
            </>
          )}
        </div>
        <div className="px-6 py-4 bg-surface-container border-t border-outline-variant">
          <p className="text-xs text-center text-outline flex items-center justify-center gap-2">
            <Shield className="w-3.5 h-3.5" /> Paid directly to the merchant on Base · Powered by Instanta
          </p>
        </div>
      </div>
    </div>
  );
}

function Card({ icon, title, text, children }: { icon: React.ReactNode; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-surface rounded-3xl p-10 w-full max-w-md text-center border border-outline-variant shadow-elevation-2">
        <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-6">{icon}</div>
        <h1 className="text-xl font-bold text-on-surface mb-2">{title}</h1>
        {text && <p className="text-on-surface-variant">{text}</p>}
        {children}
      </div>
    </div>
  );
}
