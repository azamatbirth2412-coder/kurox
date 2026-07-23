import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false, // removes X-Powered-By: Next.js header
  images: {
    remotePatterns: [
      // Anilibria CDN
      { protocol: "https", hostname: "anilibria.top" },
      { protocol: "https", hostname: "*.anilibria.top" },
      { protocol: "https", hostname: "static.anilibria.top" },
      // Shikimori
      { protocol: "https", hostname: "shikimori.one" },
      { protocol: "https", hostname: "**.shikimori.one" },
      { protocol: "https", hostname: "shikimori.me" },
      { protocol: "https", hostname: "**.shikimori.me" },
      // Other anime CDNs
      { protocol: "https", hostname: "**.animedia.tv" },
      { protocol: "https", hostname: "**.animego.org" },
      { protocol: "https", hostname: "**.kodik.biz" },
      { protocol: "https", hostname: "**.cdn.image4.io" },
      // Common image hosts
      { protocol: "https", hostname: "i.imgur.com" },
      { protocol: "https", hostname: "cdn.myanimelist.net" },
      // Catch-all for local DB posters (Kodik sync, etc.)
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000", "kurox.ru", "www.kurox.ru"] },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking — site should never be embedded
          { key: "X-Frame-Options",             value: "DENY" },
          { key: "X-Content-Type-Options",       value: "nosniff" },
          { key: "X-DNS-Prefetch-Control",       value: "on" },
          { key: "Referrer-Policy",              value: "strict-origin-when-cross-origin" },
          // Restrict browser APIs — anime site needs none of these
          { key: "Permissions-Policy",           value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
          // 2-year HSTS with preload
          { key: "Strict-Transport-Security",    value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy",   value: "same-origin-allow-popups" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          // Prevent IE/Chrome from guessing MIME types
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js requires unsafe-eval in dev; hls.js requires it in prod too
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              // Images from any https source + data URIs (for avatars/posters)
              "img-src 'self' data: blob: https:",
              // Video streams: Anilibria CDN
              "media-src 'self' blob: https://anilibria.top https://*.anilibria.top https://*.libria.fun https://*.anilibria.tv",
              // API calls: Anilibria + NextAuth
              "connect-src 'self' https://anilibria.top https://*.anilibria.top https://*.libria.fun https://*.anilibria.tv wss://anilibria.top wss://*.anilibria.top",
              // Video player iframes (Kodik, Anilibria, YummyAnime CVH/Alloha)
              "frame-src https://kodik.biz https://*.kodik.biz https://kodik.info https://*.kodik.info https://kodik.cc https://*.kodik.cc https://anilibria.top https://*.anilibria.top https://*.libria.fun https://smotret-anime.org https://*.smotret-anime.org https://anime365.ru",
              "font-src 'self' data: https://fonts.gstatic.com",
              // HLS.js service workers
              "worker-src 'self' blob:",
              // Block plugins and object embeds entirely
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: "/(.*)\\.(ico|png|svg|jpg|jpeg|gif|webp|woff|woff2)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
