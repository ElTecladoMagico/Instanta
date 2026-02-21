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

    const userInDb = useQuery(api.payments.getUserByUserId, user ? { userId: user.id } : "skip");

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push('/');
            return;
        }

        if (isLoaded && user && userId !== user.id) {
            router.push(`/dashboard/${user.id}`);
        }
    }, [isLoaded, isSignedIn, user, userId, router]);

    // Loading state
    if (!isLoaded || userInDb === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--md-background)]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 md-skeleton rounded-xl"></div>
                    <div className="h-4 w-32 md-skeleton"></div>
                </div>
            </div>
        );
    }

    // User not in DB yet
    if (userInDb === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--md-background)]">
                <div className="text-center">
                    <div className="w-16 h-16 bg-[var(--md-primary-container)] rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-soft">
                        <div className="w-8 h-8 bg-[var(--md-primary)]/30 rounded-lg"></div>
                    </div>
                    <p className="text-[var(--md-on-surface-variant)]">Initializing your account...</p>
                </div>
            </div>
        );
    }

    // Onboarding
    if (!userInDb.defaultWallet) {
        return <Onboarding userId={userInDb._id} />;
    }

    return (
        <div className="min-h-screen bg-[var(--md-background)]">
            <DashboardNavbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-[var(--md-on-surface)]">Dashboard</h1>
                    <p className="text-[var(--md-on-surface-variant)] mt-2">Manage your payment buttons and settings.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Create Button */}
                    <div className="lg:col-span-1 space-y-8">
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--md-on-surface)] mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-[var(--md-primary)] rounded-full"></span>
                                Create New Button
                            </h2>
                            <CreateButtonForm userId={userInDb._id} defaultWallet={userInDb.defaultWallet} />
                        </div>

                        {/* Profile Settings */}
                        <div>
                            <ProfileSettings userId={userInDb._id} />
                        </div>
                    </div>

                    {/* Right Column: My Buttons */}
                    <div className="lg:col-span-2">
                        <h2 className="text-lg font-semibold text-[var(--md-on-surface)] mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-[var(--md-secondary)] rounded-full"></span>
                            My Buttons
                        </h2>
                        <ButtonList userId={userInDb._id} />
                    </div>
                </div>
            </main>
        </div>
    );
}
