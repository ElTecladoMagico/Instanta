import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// El dashboard exige sesión de Clerk (ADR-006). La API /v1 usa API keys y la página /pay es pública.
const isDashboard = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isDashboard(request)) return;
  const { userId, redirectToSignIn } = await auth();
  // Sin sesión: al login de Clerk, y de vuelta al dashboard después. La URL de vuelta se construye con la
  // dirección pública: detrás de Caddy, request.url lleva la interna del contenedor (0.0.0.0:3000).
  const publicUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, process.env.NEXT_PUBLIC_APP_URL ?? request.url);
  if (!userId) return redirectToSignIn({ returnBackUrl: publicUrl.toString() });
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
