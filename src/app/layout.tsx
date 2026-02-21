import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Instanta — Crypto Payments in 60 Seconds",
  description:
    "Accept crypto payments on your website with 3 lines of code. No registration, no fees, non-custodial. Powered by Base.",
  openGraph: {
    title: "Instanta — Crypto Payments in 60 Seconds",
    description:
      "Accept crypto payments on your website with 3 lines of code. No registration, no fees, non-custodial.",
    siteName: "Instanta",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Instanta — Crypto Payments in 60 Seconds",
    description:
      "Accept crypto payments on your website with 3 lines of code. No registration, no fees, non-custodial.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.variable} ${robotoMono.variable} antialiased`}>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
