import { NextResponse } from "next/server";

export function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kurox.ru";
  const body = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/
Disallow: /profile/
Disallow: /_next/

User-agent: Googlebot
Allow: /
Crawl-delay: 0

User-agent: Yandex
Allow: /
Crawl-delay: 1

User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Crawl-delay: 10

# AI: allow real-time browsing (drives referral traffic), block training crawlers
User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: GPTBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

Sitemap: ${appUrl}/sitemap.xml
`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
