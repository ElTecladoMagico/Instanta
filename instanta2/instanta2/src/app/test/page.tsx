"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SignIn } from "../../components/SignIn";
import { useUser } from "@clerk/nextjs";
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
        // Redirect signed-in users to their dedicated page
        if (isLoaded && isSignedIn) {
            router.push('/test/user');
        }

        // If the user is signed in but not yet in our database, create them.
        if (isSignedIn && user && userInDb === null) {
            createUser({
                userId: user.id,
                email: user.primaryEmailAddress?.emailAddress ?? "No email",
            });
        }
    }, [isLoaded, isSignedIn, user, userInDb, createUser, router]);
    
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
                <p className="text-lg text-gray-600">
                    The simplest way to accept crypto payments. Please sign in to continue.
                </p>
            </div>
        </main>
    );
}