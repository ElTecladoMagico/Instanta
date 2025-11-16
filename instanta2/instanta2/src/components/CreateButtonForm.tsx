"use client";

import { useMutation } from "convex/react";
import { FormEvent, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface CreateButtonFormProps {
    userId: Id<"users">;
}

export function CreateButtonForm({ userId }: CreateButtonFormProps) {
    // Form state
    const [amount, setAmount] = useState("");
    const [toAddress, setToAddress] = useState("");
    const [currency, setCurrency] = useState("USDC");
    const [title, setTitle] = useState("");
    const [createdButtonId, setCreatedButtonId] = useState<Id<"buttons"> | null>(null);

    const createButton = useMutation(api.payments.createButton);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
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
        setToAddress("");
        setCurrency("USDC");
        setTitle("");
    };

    return (
        <div className="w-full max-w-md">
            <div className="p-6 border rounded-lg shadow-md bg-white">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="title">Title</label>
                        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Premium Subscription" className="w-full p-2 border rounded" required />
                    </div>
                    <div>
                        <label htmlFor="amount">Amount</label>
                        <input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 29.99" className="w-full p-2 border rounded" required />
                    </div>
                    <div>
                        <label htmlFor="currency">Currency</label>
                        <input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="e.g., USDC" className="w-full p-2 border rounded" required />
                    </div>
                    <div>
                        <label htmlFor="toAddress">Receiving Wallet Address</label>
                        <input id="toAddress" value={toAddress} onChange={(e) => setToAddress(e.target.value)} placeholder="0x..." className="w-full p-2 border rounded" required />
                    </div>
                    <button type="submit" className="p-2 text-white bg-blue-600 rounded hover:bg-blue-700">
                        Create Button
                    </button>
                </form>
            </div>

            {createdButtonId && (
                <div className="mt-6 p-4 text-left border rounded-lg bg-gray-50">
                    <p className="font-semibold text-center">Button Created Successfully!</p>
                    <div className="mt-4">
                        <label className="text-sm font-medium">Button ID</label>
                        <p className="text-sm font-mono mt-1 bg-gray-200 p-2 rounded break-all">
                            {createdButtonId}
                        </p>
                    </div>
                    <div className="mt-4">
                        <label className="text-sm font-medium">How to Use</label>
                        <p className="text-xs mt-1">Copy this code into your website's HTML:</p>
                        <pre className="text-sm font-mono mt-2 bg-gray-800 text-white p-3 rounded overflow-x-auto">
                            <code>
                                {`<script src="http://localhost:3000/button.js"></script>\n<button data-instanta-button-id="${createdButtonId}">\n  Pay Now\n</button>`}
                            </code>
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}
