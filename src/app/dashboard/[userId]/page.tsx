"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, use } from "react";
import { Onboarding } from "../../../components/dashboard/Onboarding";
import { CreateButtonForm } from "../../../components/dashboard/CreateButtonForm";
import { ButtonList } from "../../../components/dashboard/ButtonList";
import { DashboardNavbar } from "../../../components/dashboard/DashboardNavbar";
import { ProfileSettings } from "../../../components/dashboard/ProfileSettings";

export default function DashboardPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);
    const { user, isLoaded, isSignedIn } = useUser();
    const router = useRouter();
    const createUser = useMutation(api.payments.createUser);
    const creatingRef = useRef(false);

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

    useEffect(() => {
        if (userInDb === null && user && !creatingRef.current) {
            creatingRef.current = true;
            createUser({
                userId: user.id,
                email: user.primaryEmailAddress?.emailAddress ?? "",
            }).catch(() => {
                creatingRef.current = false;
            });
        }
    }, [userInDb, user, createUser]);

    if (!isLoaded || userInDb === undefined || userInDb === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 md-skeleton rounded-xl"></div>
                    <div className="h-4 w-32 md-skeleton"></div>
                </div>
            </div>
        );
    }

    if (!userInDb.defaultWallet) {
        return <Onboarding userId={userInDb._id} />;
    }

    return (
        <div className="min-h-screen bg-background">
            <DashboardNavbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-on-surface">Dashboard</h1>
                    <p className="text-on-surface-variant mt-2">Manage your payment buttons and settings.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-8">
                        <div>
                            <h2 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                                Create New Button
                            </h2>
                            <CreateButtonForm userId={userInDb._id} defaultWallet={userInDb.defaultWallet} />
                        </div>

                        <div>
                            <ProfileSettings userId={userInDb._id} />
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <h2 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-secondary rounded-full"></span>
                            My Buttons
                        </h2>
                        <ButtonList userId={userInDb._id} />
                    </div>
                </div>
            </main>
        </div>
    );
}
