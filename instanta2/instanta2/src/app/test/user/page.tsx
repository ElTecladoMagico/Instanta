"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SignIn } from "../../../components/SignIn";
import { CreateButtonForm } from "../../../components/CreateButtonForm";

export default function UserPage() {
    const { user, isLoaded, isSignedIn } = useUser();
    const router = useRouter();
    
    // Get the user's record from our database
    const userInDb = useQuery(api.payments.getUserByUserId, user ? { userId: user.id } : "skip");

    // Effect to handle redirection
    useEffect(() => {
        // When Clerk has loaded, if the user is not signed in, redirect them.
        if (isLoaded && !isSignedIn) {
            router.push('/test');
        }
    }, [isLoaded, isSignedIn, router]);

    // While Clerk or the user query is loading, don't render anything
    if (!isLoaded || userInDb === undefined) {
        return null;
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 gap-8">
            <div className="absolute top-8 right-8">
                <SignIn />
            </div>
            
            <div className="text-center">
                <h1 className="text-4xl font-bold">Create a Button</h1>
                <p className="text-lg text-gray-600">
                    Welcome, {user?.primaryEmailAddress?.emailAddress}
                </p>
            </div>
            
            {/* Render the form component only if we have the user's DB record */}
            {userInDb ? (
                <CreateButtonForm userId={userInDb._id} />
            ) : (
                <p>User not found in database. Please try signing in again.</p>
            )}
        </main>
    );
}
