"use client";

import { SignInButton, SignOutButton, SignedIn, SignedOut } from "@clerk/nextjs";

/**
 * A simple component that displays a sign-in button for logged-out users
 * and a sign-out button for logged-in users, using Clerk.
 */
export function SignIn() {
  return (
    <div>
      {/* The SignedOut component only renders its children if the user is not logged in. */}
      <SignedOut>
        {/* The SignInButton will open Clerk's pre-built sign-in modal. */}
        <SignInButton mode="modal">
          <button>
            Sign In
          </button>
        </SignInButton>
      </SignedOut>

      {/* The SignedIn component only renders its children if the user is logged in. */}
      <SignedIn>
        <SignOutButton>
          <button>
            Sign Out
          </button>
        </SignOutButton>
      </SignedIn>
    </div>
  );
}
