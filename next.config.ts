import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
