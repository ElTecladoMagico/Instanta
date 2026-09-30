# Instanta

Instanta is a crypto payment gateway designed for digital creators. It lets anyone accept payments in cryptocurrency by embedding a simple HTML snippet into their website — no backend required, no registration, no KYC.

This project is a **Trabajo de Fin de Grado (TFG)** by Pedro Gabriel Mantese Masegosa.

## How It Works

1. A **merchant** signs in, creates a payment button from the dashboard, and receives an HTML snippet.
2. The merchant **pastes the snippet** into their website.
3. A **buyer** clicks the button, connects their wallet, and pays directly on the Base network.
4. The payment is **confirmed automatically** via blockchain polling — funds go directly to the merchant's wallet (non-custodial).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) + React 19 |
| Backend / DB | [Convex](https://convex.dev/) (serverless, real-time) |
| Authentication | [Clerk](https://clerk.com/) |
| Blockchain | [wagmi](https://wagmi.sh/) + [viem](https://viem.sh/) on [Base Sepolia](https://docs.base.org/) (testnet) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) with a Material Design 3 theme |
| Extras | canvas-confetti (success animation), lucide-react (icons) |

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- A [Convex](https://dashboard.convex.dev/) account and project
- A [Clerk](https://dashboard.clerk.com/) application
- (Optional) An [Alchemy](https://dashboard.alchemy.com/) API key for Base Sepolia RPC

## Getting Started

```bash
# 1. Clone the repository
git clone <repo-url>
cd Instanta

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your Convex, Clerk, and Alchemy credentials

# 4. Start everything with a single command
npm run dev:all
```

This runs Next.js and the Convex dev watcher together in one terminal. Open [http://localhost:3000](http://localhost:3000) to see the landing page.

> **Tip:** If you need to run them separately for any reason, use `npm run dev` and `npx convex dev` in two terminals.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:all` | Start Next.js + Convex dev watcher in a single terminal |
| `npm run dev` | Start only the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
.
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Landing page
│   │   ├── layout.tsx          # Root layout (Clerk + Convex providers)
│   │   ├── auth-callback/      # Post-login redirect
│   │   ├── dashboard/[userId]/ # Merchant dashboard
│   │   └── widget/             # Payment checkout (loaded in iframe)
│   └── components/
│       ├── landing/            # Landing page sections (Hero, Features, etc.)
│       └── dashboard/          # Dashboard components (CreateButtonForm, ButtonList, etc.)
├── convex/
│   ├── schema.ts               # Database schema (users, buttons, payments)
│   ├── payments.ts             # Queries and mutations
│   ├── crons.ts                # Scheduled jobs (payment confirmation polling)
│   └── blockchain/             # Blockchain interaction (pollReceipt, checkPendingPayments)
├── lib/
│   └── usdc/                   # USDC contract address and ABI (Base Sepolia)
├── public/
│   ├── button.js               # Embeddable payment button script
│   └── test-button.html        # Test page for the payment widget
├── docs/                       # Project documentation and memos
├── .env.example                # Required environment variables
└── package.json
```

## Architecture Overview

Instanta follows a **non-custodial** model — funds flow directly from the buyer's wallet to the merchant's wallet. The platform never holds or touches any funds.

**Key architectural decisions:**

- **Security**: Payment details (amount, destination address) are stored server-side in Convex. The embeddable `button.js` only exposes a `buttonId` — no sensitive data is in the frontend HTML.
- **Real-time updates**: Convex reactive queries automatically sync payment status changes to the checkout UI without manual polling or WebSockets.
- **Blockchain confirmation**: A Convex cron job runs every 5 seconds, checking pending payments against `eth_getTransactionReceipt` on Base Sepolia.
- **Iframe isolation**: The checkout widget runs inside an iframe for security — isolated from the host page's JavaScript.

## Documentation

Detailed project documentation is available in the `docs/` directory:

- [`Plan_estrategico.md`](docs/archive/Plan_estrategico.md) — Strategic plan, competitive analysis, and product vision
- [`project_memo.md`](docs/archive/project_memo.md) — Phase 1 development: architecture, security fix, and core payment flow
- [`project_memo_2.md`](docs/archive/project_memo_2.md) — Phase 2 development: landing page, dashboard, and user experience
- [`decisions/001-dev-workflow-no-docker.md`](docs/decisions/001-dev-workflow-no-docker.md) — ADR: why concurrently instead of Docker for dev workflow

## License

This project is part of an academic thesis (TFG). All rights reserved.
