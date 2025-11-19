"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState, FormEvent, useEffect } from "react";
import { Settings, Wallet, Check, AlertCircle, Save } from "lucide-react";

interface ProfileSettingsProps {
    userId: Id<"users">;
}

export function ProfileSettings({ userId }: ProfileSettingsProps) {
    const [wallet, setWallet] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const user = useQuery(api.payments.getUser, { userId });
    const updateUserWallet = useMutation(api.payments.updateUserWallet);

    // Load current wallet when user data is available
    useEffect(() => {
        if (user?.defaultWallet) {
            setWallet(user.defaultWallet);
        }
    }, [user]);

    const validateAddress = (address: string) => {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);
        setIsSubmitting(true);

        if (!validateAddress(wallet)) {
            setError("Please enter a valid Ethereum address (starts with 0x, 42 characters)");
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
            setError("Failed to update wallet. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (user === undefined) {
        return (
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 w-32 bg-gray-200 rounded"></div>
                    <div className="h-10 w-full bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Settings className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Profile Settings</h2>
            </div>

            <div className="space-y-6">
                {/* Email (Read-only) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                    </label>
                    <input
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Your email is managed by your authentication provider.
                    </p>
                </div>

                {/* Wallet Address (Editable) */}
                <form onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="defaultWallet" className="block text-sm font-medium text-gray-700 mb-2">
                            Default Receiving Wallet
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Wallet className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                id="defaultWallet"
                                type="text"
                                value={wallet}
                                onChange={(e) => {
                                    setWallet(e.target.value);
                                    setError("");
                                    setSuccess(false);
                                }}
                                placeholder="0x..."
                                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                                    error
                                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                        : success
                                        ? "border-green-300 focus:ring-green-500 focus:border-green-500"
                                        : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                } focus:outline-none focus:ring-2 transition-all font-mono text-sm`}
                                required
                            />
                        </div>
                        
                        {error && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}
                        
                        {success && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                                <Check className="w-4 h-4" />
                                Wallet updated successfully!
                            </div>
                        )}
                        
                        <p className="mt-2 text-xs text-gray-500">
                            This wallet will be used as the default destination for all new payment buttons.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || wallet === user.defaultWallet}
                        className="mt-4 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            "Saving..."
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

