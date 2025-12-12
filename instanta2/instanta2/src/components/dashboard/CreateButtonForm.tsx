"use client";

import { useMutation } from "convex/react";
import { FormEvent, useState, useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Copy, Check, Plus, Sparkles } from "lucide-react";

interface CreateButtonFormProps {
    userId: Id<"users">;
    defaultWallet?: string;
}

export function CreateButtonForm({ userId, defaultWallet }: CreateButtonFormProps) {
    // Form state
    const [amount, setAmount] = useState("");
    const [toAddress, setToAddress] = useState(defaultWallet || "");
    const [currency, setCurrency] = useState("ETH");
    const [title, setTitle] = useState("");
    const [createdButtonId, setCreatedButtonId] = useState<Id<"buttons"> | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Update toAddress if defaultWallet changes
    useEffect(() => {
        if (defaultWallet) {
            setToAddress(defaultWallet);
        }
    }, [defaultWallet]);

    const createButton = useMutation(api.payments.createButton);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const buttonId = await createButton({
                userId: userId,
                amount: parseFloat(amount),
                toAddress,
                currency,
                title,
            });
            setCreatedButtonId(buttonId);

            // Reset form for creating a new button
            setAmount("");
            setCurrency("ETH");
            setTitle("");
        } catch (error) {
            console.error("Failed to create button:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyCode = () => {
        if (!createdButtonId) return;
        const code = `<script src="http://localhost:3000/button.js"></script>\n<button data-instanta-button-id="${createdButtonId}">\n  Pay Now\n</button>`;
        navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="w-full">
            <div
                className="p-6 rounded-2xl bg-[var(--md-surface)] border border-[var(--md-outline-variant)]"
                style={{ boxShadow: 'var(--md-elevation-1)' }}
            >
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div>
                        <label htmlFor="title" className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-2 uppercase tracking-wide">
                            Product Title
                        </label>
                        <input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Premium Subscription"
                            className="w-full px-4 py-3 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl focus:ring-2 focus:ring-[var(--md-primary)] focus:border-transparent outline-none transition-all text-[var(--md-on-surface)]"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="amount" className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-2 uppercase tracking-wide">
                                Amount
                            </label>
                            <input
                                id="amount"
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.05"
                                className="w-full px-4 py-3 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl focus:ring-2 focus:ring-[var(--md-primary)] focus:border-transparent outline-none transition-all text-[var(--md-on-surface)]"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="currency" className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-2 uppercase tracking-wide">
                                Currency
                            </label>
                            <input
                                id="currency"
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                placeholder="ETH"
                                className="w-full px-4 py-3 bg-[var(--md-surface-container-highest)] border border-[var(--md-outline-variant)] rounded-xl text-[var(--md-on-surface-variant)] cursor-not-allowed"
                                disabled
                                title="Currently only ETH is supported. USDC coming soon!"
                                required
                            />
                            <p className="text-xs text-[var(--md-outline)] mt-1.5">ETH only. USDC coming soon.</p>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="toAddress" className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-2 uppercase tracking-wide">
                            Receiving Wallet
                        </label>
                        <input
                            id="toAddress"
                            value={toAddress}
                            onChange={(e) => setToAddress(e.target.value)}
                            placeholder="0x..."
                            className="w-full px-4 py-3 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl focus:ring-2 focus:ring-[var(--md-primary)] focus:border-transparent outline-none transition-all font-mono text-sm text-[var(--md-on-surface)]"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-2 w-full bg-[var(--md-primary)] hover:bg-[var(--md-primary-light)] text-white font-semibold py-3.5 px-4 rounded-full transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {isSubmitting ? "Creating..." : (
                            <>
                                <Plus className="w-5 h-5" />
                                Create Button
                            </>
                        )}
                    </button>
                </form>
            </div>

            {createdButtonId && (
                <div
                    className="mt-6 p-6 text-left rounded-2xl bg-[var(--md-success-container)] border border-[var(--md-success)]/20 animate-fade-in-up"
                >
                    <div className="flex items-center justify-between mb-5">
                        <p className="font-semibold text-[var(--md-on-success-container)] flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            Button Created Successfully!
                        </p>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="text-xs font-medium text-[var(--md-on-success-container)]/70 uppercase tracking-wide">Button ID</label>
                            <p className="text-sm font-mono mt-2 bg-white/80 border border-[var(--md-success)]/20 p-3 rounded-xl break-all text-[var(--md-on-success-container)]">
                                {createdButtonId}
                            </p>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-[var(--md-on-success-container)]/70 uppercase tracking-wide">Integration Code</label>
                            <div className="mt-2 relative group">
                                <pre className="text-xs font-mono bg-[#1C1B1F] text-gray-300 p-4 rounded-xl overflow-x-auto">
                                    <code>
                                        {`<script src="http://localhost:3000/button.js"></script>\n<button data-instanta-button-id="${createdButtonId}">\n  Pay Now\n</button>`}
                                    </code>
                                </pre>
                                <button
                                    onClick={copyCode}
                                    className="absolute top-3 right-3 p-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors backdrop-blur-sm"
                                    title="Copy to clipboard"
                                >
                                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-[var(--md-on-success-container)]/70 mt-2">
                                Copy and paste this code into your website's HTML.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
