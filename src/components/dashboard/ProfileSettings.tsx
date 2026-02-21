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
            <div className="bg-surface p-6 rounded-2xl border border-outline-variant shadow-elevation-1">
                <div className="space-y-4">
                    <div className="h-6 w-32 md-skeleton"></div>
                    <div className="h-12 w-full md-skeleton"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-surface p-6 rounded-2xl border border-outline-variant shadow-elevation-1">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-secondary-container rounded-xl flex items-center justify-center">
                    <Settings className="w-6 h-6 text-secondary" />
                </div>
                <h2 className="text-xl font-semibold text-on-surface">Profile Settings</h2>
            </div>

            <div className="space-y-6">
                {/* Email (Read-only) */}
                <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-2 uppercase tracking-wide">
                        Email Address
                    </label>
                    <input
                        type="email"
                        value={user?.email ?? ""}
                        disabled
                        className="w-full px-4 py-3 rounded-xl bg-surface-container-highest border border-outline-variant text-on-surface-variant cursor-not-allowed"
                    />
                    <p className="mt-1.5 text-xs text-outline">
                        Your email is managed by your authentication provider.
                    </p>
                </div>

                {/* Wallet Address (Editable) */}
                <form onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="defaultWallet" className="block text-xs font-medium text-on-surface-variant mb-2 uppercase tracking-wide">
                            Default Receiving Wallet
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Wallet className="h-5 w-5 text-outline" />
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
                                className={`w-full pl-12 pr-4 py-3 rounded-xl bg-surface-container-low border ${
                                    error
                                        ? "border-error focus:ring-error"
                                        : success
                                            ? "border-success focus:ring-success"
                                            : "border-outline-variant focus:ring-primary"
                                } focus:outline-none focus:ring-2 focus:border-transparent transition-all font-mono text-sm text-on-surface`}
                                required
                            />
                        </div>

                        {error && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-error">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-success">
                                <Check className="w-4 h-4" />
                                Wallet updated successfully!
                            </div>
                        )}

                        <p className="mt-2 text-xs text-outline">
                            This wallet will be used as the default destination for all new payment buttons.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || wallet === user?.defaultWallet}
                        className="mt-5 w-full sm:w-auto bg-primary hover:bg-primary-light text-white font-semibold py-3 px-6 rounded-full transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
