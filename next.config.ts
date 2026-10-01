import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // imagen Docker mínima (ADR-003)
  reactCompiler: true, // this makes sure components are compiled at build time and optimized, which means we do not need to use useMemo or useCallback in most cases
  // La URL del checkout lleva el client_secret: que el navegador no la envíe como Referer
  // a la web del comercio ni a ningún otro sitio (ADR-010).
  async headers() {
    return [{ source: "/pay/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] }];
  },
};

export default nextConfig;
