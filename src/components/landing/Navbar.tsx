"use client";

import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Wallet } from "lucide-react";

export function Navbar() {
  const { user } = useUser();

  return (
    <nav className="w-full sticky top-0 z-50 md-app-bar-transparent backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <div className="bg-[var(--md-primary)] p-2.5 rounded-xl shadow-md">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-xl tracking-tight text-[var(--md-on-surface)]">
              Instanta
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-2">
            <Link
              href="#how-it-works"
              className="px-4 py-2 rounded-full text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)] transition-all duration-200 text-sm font-medium"
            >
              How it Works
            </Link>
            <Link
              href="#features"
              className="px-4 py-2 rounded-full text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)] transition-all duration-200 text-sm font-medium"
            >
              Features
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal" fallbackRedirectUrl="/auth-callback">
                <button className="px-4 py-2 text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] font-medium text-sm rounded-full hover:bg-[var(--md-surface-container-high)] transition-all duration-200">
                  Sign In
                </button>
              </SignInButton>
              <SignInButton mode="modal" fallbackRedirectUrl="/auth-callback">
                <button className="bg-[var(--md-primary)] hover:bg-[var(--md-primary-light)] text-white px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg">
                  Get Started
                </button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              {user && (
                <Link
                  href={`/dashboard/${user.id}`}
                  className="text-[var(--md-primary)] hover:bg-[var(--md-primary-container)] font-medium text-sm px-4 py-2 rounded-full transition-all duration-200 mr-2"
                >
                  Dashboard
                </Link>
              )}
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </div>
    </nav>
  );
}
