import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // imagen Docker mínima (ADR-003)
  reactCompiler: true, // this makes sure components are compiled at build time and optimized, which means we do not need to use useMemo or useCallback in most cases
};

export default nextConfig;
