"use client";

import { useEffect, useState } from "react";

interface AdSlot {
  id: string;
  slot: string;
  code: string;
  isActive: boolean;
}

interface BannerItem {
  url: string;
  link: string;
}

interface AdBannerProps {
  slot: string;
  className?: string;
  showEmpty?: boolean; // true = show placeholder (admin only)
}

const ROTATE_INTERVAL = 5000; // 5 seconds

export function AdBanner({ slot, className = "", showEmpty = false }: AdBannerProps) {
  const [adCode, setAdCode] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/ads")
      .then(r => r.json())
      .then((slots: AdSlot[]) => {
        const match = slots.find(s => s.slot === slot && s.isActive);
        const code = match?.code ?? "";

        // Detect rotating format
        if (code.startsWith("<!-- VIDEO -->")) {
          setAdCode(code);
        } else if (code.startsWith("<!-- ROTATING -->")) {
          try {
            const items: BannerItem[] = JSON.parse(code.replace("<!-- ROTATING -->", "").trim());
            setBanners(items.filter(b => b.url));
            setAdCode("rotating");
          } catch {
            setAdCode(code);
          }
        } else {
          setAdCode(code);
        }
        setLoaded(true);
      })
      .catch(() => {
        setAdCode("");
        setLoaded(true);
      });
  }, [slot]);

  // Rotate banners with smooth crossfade
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setActiveIdx(i => (i + 1) % banners.length);
        setFading(false);
      }, 400);
    }, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (!loaded) return null;

  // Rotating image banners
  if (adCode === "rotating" && banners.length > 0) {
    const banner = banners[activeIdx];
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <a
          href={banner.link || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          style={{
            opacity: fading ? 0 : 1,
            transition: "opacity 0.4s ease-in-out",
          }}
        >
          <img
            src={banner.url}
            alt="Реклама"
            className="w-full h-auto rounded-xl object-contain"
            onError={e => (e.currentTarget.style.display = "none")}
          />
        </a>
        {banners.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => { setFading(true); setTimeout(() => { setActiveIdx(i); setFading(false); }, 400); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeIdx ? "bg-white w-3" : "bg-white/40"}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Video ad
  if (adCode?.startsWith("<!-- VIDEO -->")) {
    try {
      const { videoUrl, videoLink } = JSON.parse(adCode.replace("<!-- VIDEO -->", "").trim());
      if (videoUrl) {
        return (
          <div className={className}>
            <a href={videoLink || "#"} target="_blank" rel="noopener noreferrer" className="block relative group cursor-pointer">
              <video
                src={videoUrl}
                muted autoPlay loop playsInline
                className="w-full rounded-2xl object-cover"
                style={{ maxHeight: 240 }}
              />
              <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                  Перейти →
                </span>
              </div>
            </a>
          </div>
        );
      }
    } catch {/* fall through */}
  }

  // Real ad HTML code
  if (adCode && adCode.trim()) {
    return (
      <div
        className={`w-full ${className}`}
        dangerouslySetInnerHTML={{ __html: adCode }}
      />
    );
  }

  // No ad — show placeholder only to admin, hide from regular users
  if (!showEmpty) return null;
  return (
    <div className={`flex items-center justify-center border border-dashed border-[var(--border2)] rounded-xl bg-[var(--surface)] text-[var(--text3)] text-xs font-medium py-4 px-6 ${className}`}>
      <span className="opacity-50">Рекламное место · {slot}</span>
    </div>
  );
}
