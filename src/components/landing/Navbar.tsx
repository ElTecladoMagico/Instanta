"use client";

import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Wallet, Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="w-full sticky top-0 z-50 md-app-bar-transparent backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <div className="bg-primary p-2.5 rounded-xl shadow-md">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-xl tracking-tight text-on-surface">
              Instanta
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            <a
              href="#how-it-works"
              className="px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-all duration-200 text-sm font-medium"
            >
              How it Works
            </a>
            <a
              href="#features"
              className="px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-all duration-200 text-sm font-medium"
            >
              Features
            </a>
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal" fallbackRedirectUrl="/auth-callback">
                <button className="px-4 py-2 text-on-surface-variant hover:text-on-surface font-medium text-sm rounded-full hover:bg-surface-container-high transition-all duration-200">
                  Sign In
                </button>
              </SignInButton>
              <SignInButton mode="modal" fallbackRedirectUrl="/auth-callback">
                <button className="bg-primary hover:bg-primary-light text-white px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg">
                  Get Started
                </button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              {user && (
                <Link
                  href={`/dashboard/${user.id}`}
                  className="text-primary hover:bg-primary-container font-medium text-sm px-4 py-2 rounded-full transition-all duration-200 mr-2"
                >
                  Dashboard
                </Link>
              )}
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-outline-variant bg-surface/95 backdrop-blur-xl animate-fade-in-up">
          <div className="px-4 py-4 space-y-2">
            <a
              href="#how-it-works"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors text-sm font-medium"
            >
              How it Works
            </a>
            <a
              href="#features"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors text-sm font-medium"
            >
              Features
            </a>

            <div className="pt-2 border-t border-outline-variant space-y-2">
              <SignedOut>
                <SignInButton mode="modal" fallbackRedirectUrl="/auth-callback">
                  <button className="w-full bg-primary hover:bg-primary-light text-white px-5 py-3 rounded-full text-sm font-medium transition-all duration-200 shadow-md">
                    Get Started
                  </button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                {user && (
                  <Link
                    href={`/dashboard/${user.id}`}
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center bg-primary hover:bg-primary-light text-white px-5 py-3 rounded-full text-sm font-medium transition-all duration-200 shadow-md"
                  >
                    Go to Dashboard
                  </Link>
                )}
              </SignedIn>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
