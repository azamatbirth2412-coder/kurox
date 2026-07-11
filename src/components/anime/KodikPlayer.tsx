"use client";
import { useState, useRef, useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface KodikPlayerProps {
  link: string;
  title: string;
  episode?: number;
  onTimeUpdate?: (seconds: number) => void;
}

export function KodikPlayer({ link, title, episode, onTimeUpdate }: KodikPlayerProps) {
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  let playerUrl: string;
  try {
    const url = new URL(link.startsWith("//") ? `https:${link}` : link);
    if (episode) url.searchParams.set("episode", String(episode));
    playerUrl = url.toString();
  } catch {
    playerUrl = link;
  }

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.key === "kodik_player_current_position") {
        onTimeUpdate?.(Math.floor(e.data.value));
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onTimeUpdate]);

  if (error) {
    return (
      <div className="aspect-video bg-gray-900 flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-700">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-gray-400">Плеер временно недоступен</p>
        <button
          onClick={() => setError(false)}
          className="flex items-center gap-2 text-sm text-purple-400 hover:underline"
        >
          <RefreshCw size={14} /> Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-900">
      <iframe
        ref={iframeRef}
        src={playerUrl}
        title={`${title}${episode ? ` — эпизод ${episode}` : ""}`}
        className="absolute inset-0 w-full h-full"
        allowFullScreen
        allow="autoplay; fullscreen"
        onError={() => setError(true)}
        referrerPolicy="origin"
      />
    </div>
  );
}
