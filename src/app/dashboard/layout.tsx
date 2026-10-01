// Estructura común del dashboard: barra superior, pestañas y aviso de modo test.
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Wallet } from "lucide-react";
import { getMerchant } from "./session.ts";

const TABS = [
  { href: "/dashboard", label: "Payments" },
  { href: "/dashboard/links", label: "Payment links" },
  { href: "/dashboard/developers", label: "Developers" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const merchant = await getMerchant(); // crea el comercio la primera vez que entra
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-outline-variant bg-surface">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-on-surface">
            <span className="bg-primary p-2 rounded-xl"><Wallet className="h-4 w-4 text-white" /></span>
            Instanta
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs px-3 py-1 rounded-full bg-tertiary-container text-on-tertiary-container">Test mode · Base Sepolia</span>
            <UserButton />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 flex gap-6 text-sm">
          {TABS.map((tab) => (
            <Link key={tab.href} href={tab.href} className="py-3 text-on-surface-variant hover:text-on-surface">{tab.label}</Link>
          ))}
        </div>
      </nav>
      {!merchant.payout_address && (
        <div className="max-w-6xl mx-auto px-4 mt-6">
          <p className="p-4 rounded-xl bg-error-container text-on-error-container text-sm">
            Add your payout wallet in <Link href="/dashboard/settings" className="underline">Settings</Link> before creating payments.
          </p>
        </div>
      )}
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
