"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/anime");
      }}
      className="flex items-center gap-1 text-[var(--text3)] hover:text-white transition-colors text-xs font-medium px-2 py-1 rounded-lg hover:bg-white/8 -ml-2"
    >
      <ChevronLeft size={14} />
      Назад
    </button>
  );
}
