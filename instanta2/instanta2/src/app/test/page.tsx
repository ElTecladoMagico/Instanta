"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SignIn } from "../../components/SignIn";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";

export default function Home() {
    const { user, isSignedIn } = useUser();
    
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
    
    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <div className="absolute top-8 right-8">
          <SignIn />
        </div>
        
        <div>
          <h1>Welcome to Instanta</h1>
          {/* Your main page content */}
        </div>
      </main>
    );
}