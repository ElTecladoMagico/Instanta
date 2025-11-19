"use client";

import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Wallet } from "lucide-react";

export function Navbar() {
  const { user } = useUser();

  return (
    <nav className="w-full border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">
              Instanta
            </span>
          </div>

          {/* Navigation Links (Hidden on mobile for simplicity) */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium">
              How it Works
            </Link>
            <Link href="#features" className="text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium">
              Features
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal" fallbackRedirectUrl="/auth-callback">
                <button className="text-gray-600 hover:text-gray-900 font-medium text-sm px-4 py-2">
                  Sign In
                </button>
              </SignInButton>
              <SignInButton mode="modal" fallbackRedirectUrl="/auth-callback">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md">
                  Get Started
                </button>
              </SignInButton>
            </SignedOut>
            
            <SignedIn>
              {user && (
                <Link 
                  href={`/dashboard/${user.id}`}
                  className="text-gray-600 hover:text-blue-600 font-medium text-sm mr-4"
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

