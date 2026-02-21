import { Wallet } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[var(--md-surface-container-low)] border-t border-[var(--md-outline-variant)]">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-[var(--md-primary)] p-2 rounded-xl shadow-sm">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-lg text-[var(--md-on-surface)]">Instanta</span>
          </div>

          {/* Links */}
          <div className="flex gap-6 text-sm text-[var(--md-on-surface-variant)]">
            <a
              href="#"
              className="hover:text-[var(--md-primary)] transition-colors px-3 py-2 rounded-full hover:bg-[var(--md-primary-container)]"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="hover:text-[var(--md-primary)] transition-colors px-3 py-2 rounded-full hover:bg-[var(--md-primary-container)]"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="hover:text-[var(--md-primary)] transition-colors px-3 py-2 rounded-full hover:bg-[var(--md-primary-container)]"
            >
              Contact Support
            </a>
          </div>

          {/* Copyright */}
          <div className="text-sm text-[var(--md-outline)]">
            &copy; {new Date().getFullYear()} Instanta. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
