"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to Sentry / console without crashing other users
    console.error("[Page Error]", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold mb-2">Что-то пошло не так</h2>
        <p className="text-[var(--text2)] text-sm mb-6">
          Произошла ошибка на этой странице. Остальные разделы сайта работают нормально.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-[var(--accent)] hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Попробовать снова
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/50 text-[var(--text)] rounded-xl text-sm font-semibold transition-colors"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
