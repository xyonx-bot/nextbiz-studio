import { fileURLToPath } from "node:url";
import path from "node:path";
import type { NextConfig } from "next";

// Repo dir = project root for output file tracing. Without this, a stray
// package-lock.json above the repo (e.g. ~/package-lock.json on dev VMs)
// makes Next infer the wrong workspace root and emit .next/standalone
// under a nested workspaces/... path — breaking Docker COPY + CI start.
const repoRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: repoRoot,
  serverExternalPackages: ["pg"],   // native pg must not be bundled by the build worker
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.joyverse.fun",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
