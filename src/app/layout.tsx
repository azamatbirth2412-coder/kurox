import type { Metadata, Viewport } from "next";
import "./globals.css";
import { auth } from "@/lib/auth";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TVMode } from "@/components/TVMode";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kurox.ru";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#8b5cf6",
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Kurox — Смотреть аниме онлайн бесплатно в HD",
    template: "%s | Kurox",
  },
  description:
    "Kurox — смотреть аниме онлайн бесплатно в HD 1080p с русской озвучкой. Онгоинги 2025–2026, новые серии ежедневно. Без рекламы, без регистрации.",
  keywords: [
    "аниме онлайн", "смотреть аниме бесплатно", "аниме с озвучкой",
    "аниме HD 1080p", "аниме онгоинг 2026", "новые аниме 2026",
    "лучшие аниме", "аниме без регистрации", "аниме каталог",
    "kurox аниме", "аниме онлайн русская озвучка",
    "смотреть аниме онлайн в хорошем качестве",
    "аниме 2025 2026 онлайн", "популярные аниме", "аниме сериал онлайн",
  ],
  authors: [{ name: "Kurox", url: APP_URL }],
  creator: "Kurox",
  publisher: "Kurox",
  category: "entertainment",
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Kurox",
    url: APP_URL,
    title: "Kurox — Смотреть аниме онлайн бесплатно в HD",
    description: "Тысячи аниме с русской озвучкой в HD 1080p. Онгоинги, новинки, классика — бесплатно на Kurox.",
    images: [{ url: `${APP_URL}/opengraph-image`, width: 1200, height: 630, alt: "Kurox — Аниме онлайн" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@kurox_anime",
    creator: "@kurox_anime",
    title: "Kurox — Смотреть аниме онлайн бесплатно",
    description: "Тысячи аниме с русской озвучкой в HD. Онгоинги и новинки 2026.",
    images: [`${APP_URL}/opengraph-image`],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: APP_URL,
    languages: { "ru-RU": APP_URL },
  },
  // Uncomment and add your token after registering in Google Search Console:
  // verification: { google: "YOUR_TOKEN_HERE" },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Kurox",
  url: APP_URL,
  description: "Смотреть аниме онлайн бесплатно с русской озвучкой в HD качестве",
  inLanguage: "ru",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${APP_URL}/search?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Kurox",
  url: APP_URL,
  logo: { "@type": "ImageObject", url: `${APP_URL}/logo.png` },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png?v=4" sizes="any" type="image/png" />
        <link rel="shortcut icon" href="/logo.png?v=4" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png?v=4" />
        <link rel="manifest" href="/manifest.json" />
        {/* Preconnect to Anilibria CDN for faster LCP */}
        <link rel="preconnect" href="https://static.anilibria.top" />
        <link rel="preconnect" href="https://api.anilibria.top" />
        <link rel="dns-prefetch" href="https://static.anilibria.top" />
        <link rel="dns-prefetch" href="https://cdn.anilibria.tv" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([websiteSchema, orgSchema]) }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <TVMode />
        <Providers session={session}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
