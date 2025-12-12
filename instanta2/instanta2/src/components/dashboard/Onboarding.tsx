"use client";

import { useMutation } from "convex/react";
import { useState, FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Wallet, ArrowRight, AlertCircle } from "lucide-react";

interface OnboardingProps {
    userId: Id<"users">;
}

export function Onboarding({ userId }: OnboardingProps) {
    const [wallet, setWallet] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateUserWallet = useMutation(api.payments.updateUserWallet);

    const validateAddress = (address: string) => {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        if (!validateAddress(wallet)) {
            setError("Please enter a valid Ethereum address (starts with 0x...)");
            setIsSubmitting(false);
            return;
        }

        try {
            await updateUserWallet({
                userId,
                defaultWallet: wallet,
            });
        } catch (err) {
            console.error(err);
            setError("Failed to save wallet. Please try again.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--md-background)] px-4">
            <div
                className="max-w-md w-full bg-[var(--md-surface)] rounded-3xl p-8 border border-[var(--md-outline-variant)]"
                style={{ boxShadow: 'var(--md-elevation-3)' }}
            >
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-[var(--md-primary-container)] rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Wallet className="w-10 h-10 text-[var(--md-primary)]" />
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--md-on-surface)] mb-3">Welcome to Instanta</h1>
                    <p className="text-[var(--md-on-surface-variant)]">
                        To get started, please enter the wallet address where you want to receive payments.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="wallet" className="block text-sm font-medium text-[var(--md-on-surface-variant)] mb-2 uppercase tracking-wide">
                            Receiving Wallet Address
                        </label>
                        <input
                            id="wallet"
                            type="text"
                            value={wallet}
                            onChange={(e) => setWallet(e.target.value)}
                            placeholder="0x..."
                            className={`w-full px-4 py-4 rounded-xl bg-[var(--md-surface-container-low)] border ${error
                                    ? "border-[var(--md-error)] focus:ring-[var(--md-error)]"
                                    : "border-[var(--md-outline-variant)] focus:ring-[var(--md-primary)]"
                                } focus:outline-none focus:ring-2 focus:border-transparent transition-all font-mono text-[var(--md-on-surface)]`}
                            required
                        />
                        {error && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-[var(--md-error)]">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}
                        <p className="mt-2 text-xs text-[var(--md-outline)]">
                            You can change this later in your profile settings.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[var(--md-primary)] hover:bg-[var(--md-primary-light)] text-white font-semibold py-4 px-6 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Saving..." : "Continue to Dashboard"}
                        {!isSubmitting && <ArrowRight className="w-5 h-5" />}
                    </button>
                </form>
            </div>
        </div>
    );
}
