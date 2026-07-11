import { NextResponse } from "next/server";

export function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kurox.ru";
  const body = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

Sitemap: ${appUrl}/sitemap.xml
`;
  return new NextResponse(body, { headers: { "Content-Type": "text/plain" } });
}
