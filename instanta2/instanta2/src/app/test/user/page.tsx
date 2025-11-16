"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { SignIn } from "../../../components/SignIn";

export default function UserPage() {
    const { user, isLoaded, isSignedIn } = useUser();
    const router = useRouter();
    
    // Form state
    const [amount, setAmount] = useState("");
    const [toAddress, setToAddress] = useState("");
    const [currency, setCurrency] = useState("USDC");
    const [title, setTitle] = useState("");
    const [createdButtonId, setCreatedButtonId] = useState<Id<"buttons"> | null>(null);

    // Get the user's record from our database
    const userInDb = useQuery(api.payments.getUserByUserId, user ? { userId: user.id } : "skip");
    const createButton = useMutation(api.payments.createButton);

    // Effect to handle redirection
    useEffect(() => {
        // When Clerk has loaded, if the user is not signed in, redirect them.
        if (isLoaded && !isSignedIn) {
            router.push('/test');
        }
    }, [isLoaded, isSignedIn, router]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!userInDb) {
            console.error("User not found in DB. Cannot create button.");
            return; 
        }

        const buttonId = await createButton({
            userId: userInDb._id, // Use the Convex user ID
            amount: parseFloat(amount),
            toAddress,
            currency,
            title,
        });
        setCreatedButtonId(buttonId);
        console.log("Created new button with ID:", buttonId);

        // Reset form
        setAmount("");
        setToAddress("");
        setCurrency("USDC");
        setTitle("");
    };

    // While Clerk is loading, don't render anything
    if (!isLoaded) {
        return null;
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 gap-8">
            <div className="absolute top-8 right-8">
                {/* It's good practice to have a sign-out button on protected pages */}
                <SignIn />
            </div>
            
            <div className="text-center">
                <h1 className="text-4xl font-bold">Create a Button</h1>
                <p className="text-lg text-gray-600">
                    Welcome, {user?.primaryEmailAddress?.emailAddress}
                </p>
            </div>

            <div className="w-full max-w-md p-6 border rounded-lg shadow-md bg-white">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="title">Title</label>
                        <input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Premium Subscription"
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="amount">Amount</label>
                        <input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="e.g., 29.99"
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="currency">Currency</label>
                        <input
                            id="currency"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            placeholder="e.g., USDC"
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="toAddress">Receiving Wallet Address</label>
                        <input
                            id="toAddress"
                            value={toAddress}
                            onChange={(e) => setToAddress(e.target.value)}
                            placeholder="0x..."
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>
                    <button type="submit" className="p-2 text-white bg-blue-600 rounded hover:bg-blue-700">
                        Create Button
                    </button>
                </form>

                {createdButtonId && (
                    <div className="mt-6 p-4 text-center border-t">
                        <p className="font-semibold">Button created successfully!</p>
                        <p className="text-sm font-mono mt-2 bg-gray-100 p-2 rounded">
                            ID: {createdButtonId}
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
