"use client";

import { Navbar } from "../components/landing/Navbar";
import { Hero } from "../components/landing/Hero";
import { HowItWorks } from "../components/landing/HowItWorks";
import { Features } from "../components/landing/Features";
import { Footer } from "../components/landing/Footer";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LandingPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      router.push(`/dashboard/${user.id}`);
    }
  }, [isLoaded, isSignedIn, user, router]);

  return (
    <main className="min-h-screen bg-white selection:bg-blue-100 selection:text-blue-900">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Footer />
    </main>
  );
}
