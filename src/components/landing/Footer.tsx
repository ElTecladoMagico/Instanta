import { Wallet } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-primary p-2 rounded-xl shadow-sm">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-lg text-on-surface">Instanta</span>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed max-w-xs">
              The simplest way to accept crypto payments on your website. Non-custodial, instant, and secure.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-on-surface uppercase tracking-wide mb-4">Product</h3>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li>
                <a href="#how-it-works" className="hover:text-primary transition-colors">How it Works</a>
              </li>
              <li>
                <a href="#features" className="hover:text-primary transition-colors">Features</a>
              </li>
            </ul>
          </div>

          {/* Built with */}
          <div>
            <h3 className="text-sm font-semibold text-on-surface uppercase tracking-wide mb-4">Built with</h3>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li>
                <a href="https://base.org" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  Base Network
                </a>
              </li>
              <li>
                <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  Next.js
                </a>
              </li>
              <li>
                <a href="https://www.postgresql.org" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  PostgreSQL
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-outline-variant flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-outline">
            &copy; {new Date().getFullYear()} Instanta. TFG by Pedro Gabriel Mantese Masegosa.
          </p>
          <p className="text-xs text-outline">
            Built on Base Sepolia (testnet)
          </p>
        </div>
      </div>
    </footer>
  );
}
