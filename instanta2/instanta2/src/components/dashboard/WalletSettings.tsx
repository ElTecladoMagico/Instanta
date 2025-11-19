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
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Wallet className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Wallet Settings</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="settings-wallet" className="block text-sm font-medium text-gray-700 mb-1">
                        Default Receiving Address
                    </label>
                    <input
                        id="settings-wallet"
                        type="text"
                        value={wallet}
                        onChange={(e) => setWallet(e.target.value)}
                        placeholder="0x..."
                        className={`w-full px-3 py-2 border rounded-lg font-mono text-sm ${
                            error ? "border-red-300 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
                        } focus:outline-none focus:ring-2 transition-all`}
                    />
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                        <Check className="w-4 h-4" />
                        Wallet updated successfully!
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting || wallet === currentWallet}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

