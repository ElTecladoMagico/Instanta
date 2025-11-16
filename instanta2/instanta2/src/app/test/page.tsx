"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SignIn } from "../../components/SignIn";
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
    const { user, isSignedIn, isLoaded } = useUser();
    const router = useRouter();
    
    // Check if the user exists in our Convex database
    const userInDb = useQuery(api.payments.getUserByUserId, user ? { userId: user.id } : "skip");
    
    // Mutation to create a new user
    const createUser = useMutation(api.payments.createUser);

    useEffect(() => {
        // If the user is signed in but not yet in our database, create them.
        if (isSignedIn && user && userInDb === null) {
            createUser({
                userId: user.id,
                email: user.primaryEmailAddress?.emailAddress ?? "No email",
            });
        }
    }, [isSignedIn, user, userInDb, createUser]);
    
    // While Clerk is loading, show a blank screen to prevent flashing
    if (!isLoaded) {
        return null;
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="absolute top-8 right-8">
                <SignIn />
            </div>
            
            <div className="text-center">
                <h1 className="text-4xl font-bold">Welcome to Instanta</h1>
                
                {/* Show this message if the user is signed out */}
                <SignedOut>
                    <p className="text-lg text-gray-600 mt-4">
                        The simplest way to accept crypto payments. Please sign in to continue.
                    </p>
                </SignedOut>
                
                {/* Show this message and button if the user is signed in */}
                <SignedIn>
                    <p className="text-lg text-gray-600 mt-4">
                        You are signed in. Go to your dashboard to create a new payment button.
                    </p>
                    <button 
                        onClick={() => router.push('/test/user')}
                        className="mt-6 px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                        Go to User Dashboard
                    </button>
                </SignedIn>
            </div>
        </main>
    );
}