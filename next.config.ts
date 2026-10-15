import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal self-contained server in .next/standalone for the Docker image.
  output: "standalone",
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "coin-images.coingecko.com" }, { protocol: "https", hostname: "assets.coingecko.com" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
