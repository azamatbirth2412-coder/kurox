"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "kurox_splash_shown";

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    // Only show once per session
    const shown = sessionStorage.getItem(STORAGE_KEY);
    if (!shown) {
      setVisible(true);
      sessionStorage.setItem(STORAGE_KEY, "1");

      const hideTimer = setTimeout(() => {
        setHiding(true);
        const removeTimer = setTimeout(() => setVisible(false), 500);
        return () => clearTimeout(removeTimer);
      }, 2500);

      return () => clearTimeout(hideTimer);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--bg)] transition-opacity duration-500 ${hiding ? "opacity-0" : "opacity-100"}`}
      style={{ pointerEvents: hiding ? "none" : "all" }}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Animated logo */}
        <div
          className="relative"
          style={{
            animation: "splashLogoIn 0.8s cubic-bezier(0.22,1,0.36,1) forwards",
            opacity: 0,
          }}
        >
          <img src="/logo.png" alt="Kurox" width={80} height={80} className="rounded-[22px] shadow-2xl shadow-violet-900/60" />
          {/* Glow ring */}
          <div
            className="absolute inset-0 rounded-[22px] border-2 border-violet-400/40"
            style={{ animation: "splashRingPulse 2s ease-in-out infinite" }}
          />
        </div>

        {/* KUROX wordmark */}
        <div
          style={{
            animation: "splashTextIn 0.9s 0.2s cubic-bezier(0.22,1,0.36,1) forwards",
            opacity: 0,
          }}
        >
          <span
            className="text-4xl font-black tracking-widest"
            style={{
              background: "linear-gradient(135deg, #c4b5fd 0%, #818cf8 50%, #7c3aed 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            KUROX
          </span>
        </div>

        {/* Tagline */}
        <p
          className="text-sm text-[var(--text2)] tracking-wider"
          style={{
            animation: "splashTextIn 1s 0.5s ease-out forwards",
            opacity: 0,
          }}
        >
          Смотри аниме бесплатно
        </p>

        {/* Loading bar */}
        <div
          className="w-32 h-0.5 bg-[var(--surface2)] rounded-full overflow-hidden mt-2"
          style={{
            animation: "splashTextIn 0.5s 0.6s ease-out forwards",
            opacity: 0,
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full"
            style={{ animation: "splashBar 2s 0.6s linear forwards" }}
          />
        </div>
      </div>

      <style>{`
        @keyframes splashLogoIn {
          from { opacity: 0; transform: scale(0.7) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes splashTextIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashRingPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50%       { transform: scale(1.08); opacity: 0.8; }
        }
        @keyframes splashBar {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}
