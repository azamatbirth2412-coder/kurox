import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.shikimori.one" },
      { protocol: "https", hostname: "**.shikimori.me" },
      { protocol: "https", hostname: "shikimori.one" },
      { protocol: "https", hostname: "shikimori.me" },
      { protocol: "https", hostname: "**.animedia.tv" },
      { protocol: "https", hostname: "**.animego.org" },
      { protocol: "https", hostname: "**.kodik.biz" },
      { protocol: "https", hostname: "**.cdn.image4.io" },
      { protocol: "http", hostname: "**" },
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
  },
};

export default nextConfig;
