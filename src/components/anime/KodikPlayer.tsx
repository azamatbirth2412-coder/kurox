"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, ExternalLink } from "lucide-react";

interface Props {
  title: string;
  titleEn?: string;
}

type Status = "loading" | "loaded" | "not_found" | "no_token" | "error";

export function KodikPlayer({ title, titleEn }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ title });
    if (titleEn) params.set("titleEn", titleEn);

    fetch(`/api/kodik?${params}`)
      .then(async res => {
        if (res.status === 503) { setStatus("no_token"); return; }
        if (res.status === 404) { setStatus("not_found"); return; }
        if (!res.ok) { setStatus("error"); return; }
        const data = await res.json();
        if (data.iframeUrl) {
          setIframeUrl(data.iframeUrl);
          setStatus("loaded");
        } else {
          setStatus("not_found");
        }
      })
      .catch(() => setStatus("error"));
  }, [title, titleEn]);

  if (status === "loading") {
    return (
      <div className="aspect-video bg-[var(--surface)] rounded-2xl flex items-center justify-center gap-3 text-[var(--text2)]">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Ищем на Kodik…</span>
      </div>
    );
  }

  if (status === "no_token") {
    return (
      <div className="aspect-video bg-[var(--surface)] rounded-2xl flex flex-col items-center justify-center gap-3 text-center px-6">
        <AlertCircle size={28} className="text-amber-400" />
        <p className="text-sm font-semibold">Kodik не настроен</p>
        <p className="text-xs text-[var(--text2)]">
          Добавьте <code className="bg-[var(--surface2)] px-1 rounded">KODIK_TOKEN</code> в переменные окружения
        </p>
      </div>
    );
  }

  if (status === "not_found") {
    return (
      <div className="aspect-video bg-[var(--surface)] rounded-2xl flex flex-col items-center justify-center gap-2 text-center px-6">
        <AlertCircle size={28} className="text-[var(--text3)]" />
        <p className="text-sm text-[var(--text2)]">Это аниме не найдено на Kodik</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="aspect-video bg-[var(--surface)] rounded-2xl flex flex-col items-center justify-center gap-2 text-center px-6">
        <AlertCircle size={28} className="text-red-400" />
        <p className="text-sm text-[var(--text2)]">Ошибка загрузки Kodik</p>
      </div>
    );
  }

  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
      <iframe
        src={iframeUrl!}
        className="absolute inset-0 w-full h-full"
        allowFullScreen
        allow="autoplay; fullscreen"
        title={title}
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a
        href={iframeUrl!}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-2 right-2 z-10 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-lg transition-colors"
        title="Открыть в Kodik"
      >
        <ExternalLink size={14} />
      </a>
    </div>
  );
}
