import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true, // this makes sure components are compiled at build time and optimized, which means we do not need to use useMemo or useCallback in most cases
};

export default nextConfig;
