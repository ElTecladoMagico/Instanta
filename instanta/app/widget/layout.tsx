"use client";
import { ConvexProvider } from "convex/react";
import { ConvexReactClient } from "convex/react";
import { WidgetProviders } from "./providers";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <ConvexProvider client={convex}>
          <WidgetProviders>
            {children}
          </WidgetProviders>
        </ConvexProvider>
      </body>
    </html>
  );
}