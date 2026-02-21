"use client";

import { SignInButton, SignedOut, SignedIn, useUser } from "@clerk/nextjs";
import { ArrowRight, Play, CheckCircle2, Shield, Zap } from "lucide-react";
import Link from "next/link";

export function Hero() {
  const { user } = useUser();

  return (
    <section className="relative overflow-hidden bg-background pt-16 pb-20 lg:pt-24 lg:pb-28">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 w-full -translate-x-1/2 h-full z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-container rounded-full blur-3xl opacity-60 mix-blend-multiply animate-blob"></div>
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-tertiary-container rounded-full blur-3xl opacity-60 mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-secondary-container rounded-full blur-3xl opacity-40 mix-blend-multiply animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-container text-on-primary-container text-sm font-medium mb-8 animate-fade-in-up shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
          </span>
          Now Live on Base Sepolia
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-on-surface mb-6 max-w-4xl mx-auto leading-tight">
          Accept Crypto Payments in{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            Minutes
          </span>
          , Not Weeks.
        </h1>

        {/* Subheadline */}
        <p className="text-xl text-on-surface-variant mb-10 max-w-2xl mx-auto leading-relaxed">
          The simplest way to integrate crypto payments into your website.
          <span className="text-on-surface font-semibold"> Copy, paste, and earn. </span>
          No backend required. Secure by design.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary-light text-white rounded-full font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group">
                Start for Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            {user && (
              <Link href={`/dashboard/${user.id}`}>
                <button className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary-light text-white rounded-full font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group">
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            )}
          </SignedIn>

          <a
            href="#how-it-works"
            className="w-full sm:w-auto px-8 py-4 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-full font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2 border border-outline-variant"
          >
            <Play className="w-5 h-5 text-tertiary fill-tertiary" />
            See How it Works
          </a>
        </div>

        {/* Trust Indicators — each with distinct color to avoid copy-paste feel */}
        <div className="flex flex-wrap justify-center gap-3 text-sm font-medium mb-16">
          <div className="flex items-center gap-2 px-4 py-2 bg-success-container text-on-success-container rounded-full">
            <CheckCircle2 className="w-4 h-4" />
            No Credit Card Required
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container rounded-full">
            <Zap className="w-4 h-4" />
            Instant Setup
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary-container text-on-secondary-container rounded-full">
            <Shield className="w-4 h-4" />
            Secure on Base
          </div>
        </div>

        {/* Video Placeholder */}
        <div className="relative max-w-5xl mx-auto">
          <div className="absolute -inset-2 bg-gradient-to-r from-primary via-secondary to-tertiary rounded-3xl blur-lg opacity-20"></div>
          <div className="relative aspect-video bg-code-surface rounded-3xl overflow-hidden flex items-center justify-center group cursor-pointer shadow-elevation-5">
            <div className="text-center">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 border border-white/20">
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </div>
              <p className="text-gray-400 font-medium">Watch the 1-minute demo</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-code-surface/80 via-transparent to-transparent pointer-events-none"></div>
          </div>
        </div>

      </div>
    </section>
  );
}
