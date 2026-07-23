"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="ru">
      <body style={{ background: "#0a0910", color: "#e2e8f0", fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⚠️</div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Произошла ошибка</h2>
          <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "1.5rem" }}>Попробуйте обновить страницу</p>
          <button
            onClick={reset}
            style={{ background: "#7c3aed", color: "white", border: "none", borderRadius: "12px", padding: "10px 24px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}
          >
            Обновить
          </button>
        </div>
      </body>
    </html>
  );
}
