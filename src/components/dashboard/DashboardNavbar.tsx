"use client";

import { SignedIn, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Wallet } from "lucide-react";

export function DashboardNavbar() {
  return (
    <nav className="w-full sticky top-0 z-50 bg-[var(--md-surface)]/95 backdrop-blur-xl border-b border-[var(--md-outline-variant)]" style={{ boxShadow: 'var(--md-elevation-1)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-3 group">
            <div className="bg-[var(--md-primary)] p-2.5 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-xl tracking-tight text-[var(--md-on-surface)]">
              Instanta
            </span>
          </Link>

          {/* Auth Section */}
          <div className="flex items-center gap-4">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </div>
    </nav>
  );
}
