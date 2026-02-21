"use client";

import { useMutation } from "convex/react";
import { useState, FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Wallet, Save, AlertCircle, Check } from "lucide-react";

interface WalletSettingsProps {
    userId: Id<"users">;
    currentWallet?: string;
}

export function WalletSettings({ userId, currentWallet }: WalletSettingsProps) {
    const [wallet, setWallet] = useState(currentWallet || "");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateUserWallet = useMutation(api.payments.updateUserWallet);

    const validateAddress = (address: string) => {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);
        setIsSubmitting(true);

        if (!validateAddress(wallet)) {
            setError("Invalid Ethereum address format.");
            setIsSubmitting(false);
            return;
        }

        try {
            await updateUserWallet({
                userId,
                defaultWallet: wallet,
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error(err);
            setError("Failed to update wallet.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="bg-[var(--md-surface)] p-6 rounded-2xl border border-[var(--md-outline-variant)]"
            style={{ boxShadow: 'var(--md-elevation-1)' }}
        >
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-[var(--md-primary-container)] rounded-xl flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-[var(--md-primary)]" />
                </div>
                <h3 className="font-semibold text-lg text-[var(--md-on-surface)]">Wallet Settings</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label htmlFor="settings-wallet" className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-2 uppercase tracking-wide">
                        Default Receiving Address
                    </label>
                    <input
                        id="settings-wallet"
                        type="text"
                        value={wallet}
                        onChange={(e) => setWallet(e.target.value)}
                        placeholder="0x..."
                        className={`w-full px-4 py-3 bg-[var(--md-surface-container-low)] border rounded-xl font-mono text-sm text-[var(--md-on-surface)] ${error
                                ? "border-[var(--md-error)] focus:ring-[var(--md-error)]"
                                : "border-[var(--md-outline-variant)] focus:ring-[var(--md-primary)]"
                            } focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                    />
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-sm text-[var(--md-error)]">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="flex items-center gap-2 text-sm text-[var(--md-success)]">
                        <Check className="w-4 h-4" />
                        Wallet updated successfully!
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting || wallet === currentWallet}
                    className="w-full bg-[var(--md-primary)] hover:bg-[var(--md-primary-light)] text-white font-medium py-3 px-4 rounded-full transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                    {isSubmitting ? "Saving..." : (
                        <>
                            <Save className="w-4 h-4" />
                            Save Changes
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
