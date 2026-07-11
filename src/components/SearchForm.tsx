"use client";
import { useRouter } from "next/navigation";
import { useState, useCallback, useRef } from "react";
import { Search } from "lucide-react";

export function SearchForm({ initialQuery }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery || "");
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      setQuery(q);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }, 400);
    },
    [router]
  );

  return (
    <form action="/search" className="relative max-w-xl">
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        name="q"
        value={query}
        onChange={handleChange}
        placeholder="Введите название аниме..."
        className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-purple-500 text-sm"
        autoFocus
      />
    </form>
  );
}
