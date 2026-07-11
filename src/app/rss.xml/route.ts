import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kurox.ru";
  const posts = await prisma.newsPost.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const items = posts
    .map(
      (p) => `
    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${BASE_URL}/news/${p.slug}</link>
      <description><![CDATA[${p.description || ""}]]></description>
      <pubDate>${new Date(p.createdAt).toUTCString()}</pubDate>
      <guid>${BASE_URL}/news/${p.slug}</guid>
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Kurox — Новости аниме</title>
    <link>${BASE_URL}</link>
    <description>Последние новости мира аниме на Kurox</description>
    <language>ru</language>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(xml, { headers: { "Content-Type": "application/xml" } });
}
