"use client";

import { useMutation } from "convex/react";
import { FormEvent, useState, useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Copy, Check, Plus } from "lucide-react";

interface CreateButtonFormProps {
    userId: Id<"users">;
    defaultWallet?: string;
}

export function CreateButtonForm({ userId, defaultWallet }: CreateButtonFormProps) {
    // Form state
    const [amount, setAmount] = useState("");
    const [toAddress, setToAddress] = useState(defaultWallet || "");
    // TODO: Future versions will support USDC. For now, we use ETH for simplicity.
    const [currency, setCurrency] = useState("ETH");
    const [title, setTitle] = useState("");
    const [createdButtonId, setCreatedButtonId] = useState<Id<"buttons"> | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Update toAddress if defaultWallet changes (e.g. after onboarding)
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

            // Reset form for creating a new button, but keep the wallet address
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
            <div className="p-6 border border-gray-100 rounded-xl shadow-sm bg-white">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Product Title</label>
                        <input 
                            id="title" 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            placeholder="e.g., Premium Subscription" 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                            required 
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                            <input 
                                id="amount" 
                                type="number" 
                                step="0.01" 
                                value={amount} 
                                onChange={(e) => setAmount(e.target.value)} 
                                placeholder="29.99" 
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                                required 
                            />
                        </div>
                        <div>
                            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                            <input 
                                id="currency" 
                                value={currency} 
                                onChange={(e) => setCurrency(e.target.value)} 
                                placeholder="ETH" 
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                                disabled
                                title="Currently only ETH is supported. USDC coming soon!"
                                required 
                            />
                            <p className="text-xs text-gray-500 mt-1">Currently only ETH is supported. USDC coming in future versions.</p>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="toAddress" className="block text-sm font-medium text-gray-700 mb-1">Receiving Wallet</label>
                        <input 
                            id="toAddress" 
                            value={toAddress} 
                            onChange={(e) => setToAddress(e.target.value)} 
                            placeholder="0x..." 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm" 
                            required 
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 disabled:opacity-70"
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
                <div className="mt-6 p-5 text-left border border-green-100 rounded-xl bg-green-50 animate-fade-in-up">
                    <div className="flex items-center justify-between mb-4">
                        <p className="font-semibold text-green-800 flex items-center gap-2">
                            <Check className="w-5 h-5" />
                            Button Created!
                        </p>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-green-700 uppercase tracking-wider">Button ID</label>
                            <p className="text-sm font-mono mt-1 bg-white border border-green-200 p-2 rounded-lg break-all text-gray-600">
                                {createdButtonId}
                            </p>
                        </div>
                        
                        <div>
                            <label className="text-xs font-semibold text-green-700 uppercase tracking-wider">Integration Code</label>
                            <div className="mt-1 relative group">
                                <pre className="text-xs font-mono bg-gray-900 text-gray-300 p-4 rounded-lg overflow-x-auto border border-gray-800">
                                    <code>
                                        {`<script src="http://localhost:3000/button.js"></script>\n<button data-instanta-button-id="${createdButtonId}">\n  Pay Now\n</button>`}
                                    </code>
                                </pre>
                                <button 
                                    onClick={copyCode}
                                    className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-md text-white transition-colors backdrop-blur-sm"
                                    title="Copy to clipboard"
                                >
                                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-green-700 mt-2">
                                Copy and paste this code into your website's HTML.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

