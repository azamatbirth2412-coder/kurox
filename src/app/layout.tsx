import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://kurox.ru"),
  title: {
    default: "Kurox — Смотреть аниме онлайн бесплатно",
    template: "%s | Kurox",
  },
  description:
    "Kurox — лучший сайт для просмотра аниме онлайн в хорошем качестве. Огромная база тайтлов, удобный плеер, новые серии ежедневно.",
  keywords: ["аниме", "смотреть аниме онлайн", "аниме онлайн бесплатно", "kurox"],
  openGraph: { type: "website", locale: "ru_RU", siteName: "Kurox" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7c3aed" />
      </head>
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen flex flex-col`}>
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
