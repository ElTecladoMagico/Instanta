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
            // The parent component will automatically re-render and show the dashboard
            // because the user query will update with the new defaultWallet
        } catch (err) {
            console.error(err);
            setError("Failed to save wallet. Please try again.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Wallet className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Instanta</h1>
                    <p className="text-gray-600">
                        To get started, please enter the wallet address where you want to receive payments.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="wallet" className="block text-sm font-medium text-gray-700 mb-2">
                            Receiving Wallet Address
                        </label>
                        <input
                            id="wallet"
                            type="text"
                            value={wallet}
                            onChange={(e) => setWallet(e.target.value)}
                            placeholder="0x..."
                            className={`w-full px-4 py-3 rounded-lg border ${
                                error ? "border-red-300 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
                            } focus:outline-none focus:ring-2 transition-all`}
                            required
                        />
                        {error && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}
                        <p className="mt-2 text-xs text-gray-500">
                            You can change this later in your profile settings.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Saving..." : "Continue to Dashboard"}
                        {!isSubmitting && <ArrowRight className="w-5 h-5" />}
                    </button>
                </form>
            </div>
        </div>
    );
}

