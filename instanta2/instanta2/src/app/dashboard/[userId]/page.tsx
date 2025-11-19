"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, use } from "react";
import { Onboarding } from "../../../components/dashboard/Onboarding";
import { CreateButtonForm } from "../../../components/dashboard/CreateButtonForm";
import { ButtonList } from "../../../components/dashboard/ButtonList";
import { DashboardNavbar } from "../../../components/dashboard/DashboardNavbar";
import { ProfileSettings } from "../../../components/dashboard/ProfileSettings";

export default function DashboardPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);
    const { user, isLoaded, isSignedIn } = useUser();
    const router = useRouter();
    
    // Get the user's record from our database
    // We use the userId from the URL params, but we should verify it matches the logged-in user
    const userInDb = useQuery(api.payments.getUserByUserId, user ? { userId: user.id } : "skip");

    // Effect to handle redirection if not signed in or if trying to access another user's dashboard
    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push('/');
            return;
        }

        if (isLoaded && user && userId !== user.id) {
            // Redirect to their own dashboard if they try to access someone else's
            router.push(`/dashboard/${user.id}`);
        }
    }, [isLoaded, isSignedIn, user, userId, router]);

    // Loading state
    if (!isLoaded || userInDb === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-8 w-32 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 w-48 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    // If user is not in DB yet (shouldn't happen if flow is correct, but safety check)
    if (userInDb === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p>Initializing your account...</p>
            </div>
        );
    }

    // Check if user has completed onboarding (has a default wallet)
    if (!userInDb.defaultWallet) {
        return <Onboarding userId={userInDb._id} />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <DashboardNavbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-600 mt-1">Manage your payment buttons and settings.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Create Button */}
                    <div className="lg:col-span-1 space-y-8">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Button</h2>
                            <CreateButtonForm userId={userInDb._id} defaultWallet={userInDb.defaultWallet} />
                        </div>

                        {/* Profile Settings */}
                        <div>
                            <ProfileSettings userId={userInDb._id} />
                        </div>
                    </div>

                    {/* Right Column: My Buttons */}
                    <div className="lg:col-span-2">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">My Buttons</h2>
                        <ButtonList userId={userInDb._id} />
                    </div>
                </div>
            </main>
        </div>
    );
}

