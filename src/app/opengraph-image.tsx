import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kurox — Смотреть аниме онлайн бесплатно";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f0a1e 0%, #1a0f3a 50%, #0d0818 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Logo box */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 24,
            background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
            boxShadow: "0 0 60px rgba(139,92,246,0.5)",
          }}
        >
          <span style={{ color: "white", fontSize: 52, fontWeight: 900 }}>K</span>
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: "white",
            letterSpacing: "-2px",
            marginBottom: 16,
          }}
        >
          KUROX
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "rgba(196,181,253,0.9)",
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          Смотреть аниме онлайн бесплатно
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 20,
            color: "rgba(139,92,246,0.8)",
            marginTop: 12,
            fontWeight: 400,
          }}
        >
          HD 1080p · Русская озвучка · Без рекламы
        </div>

        {/* Bottom domain */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 18,
            color: "rgba(255,255,255,0.3)",
          }}
        >
          kurox.ru
        </div>
      </div>
    ),
    { ...size }
  );
}
