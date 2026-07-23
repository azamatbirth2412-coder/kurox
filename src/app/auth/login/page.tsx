"use client";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only allow same-origin relative paths — prevents open redirect via ?callbackUrl=https://evil.com
  const rawCallback = searchParams.get("callbackUrl") || "/";
  const callbackUrl = rawCallback.startsWith("/") && !rawCallback.startsWith("//") ? rawCallback : "/";
  const justRegistered = searchParams.get("registered") === "1";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    // Purge any stale/undecryptable session cookies (e.g. old chunked tokens from a
    // rotated secret) BEFORE signing in — leftover chunks corrupt the new session.
    try {
      await fetch("/api/clear-auth", { method: "POST" });
    } catch {
      // non-fatal — proceed with login anyway
    }
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setLoading(false);
      setError("Неверный email или пароль");
    } else {
      // Full page navigation (not router.push) so the SessionProvider and all
      // server components start fresh with the new session cookie.
      window.location.href = callbackUrl;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
      {justRegistered && !error && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl px-4 py-3 text-sm">
          Аккаунт создан! Войдите, используя свои данные.
        </div>
      )}
      {error && (
        <div className="bg-[var(--red-dim)] border border-[var(--red)]/30 text-[var(--red)] rounded-xl px-4 py-3 text-sm">{error}</div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm text-[var(--text-muted)] mb-1.5">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
          className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
          placeholder="you@example.com" />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm text-[var(--text-muted)] mb-1.5">Пароль</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
          className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
          placeholder="••••••••" />
      </div>
      <button type="submit" disabled={loading}
        className="w-full bg-gradient-to-r from-[var(--accent2)] to-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-[opacity,filter] duration-150 shadow-lg shadow-[var(--accent-glow)]">
        {loading ? "Входим..." : "Войти"}
      </button>
      <div className="flex items-center justify-between text-sm">
        <Link href="/auth/forgot-password" className="text-[var(--text2)] hover:text-[var(--accent)] transition-colors">
          Забыли пароль?
        </Link>
        <Link href="/auth/register" className="text-purple-400 hover:text-purple-300 transition-colors">
          Зарегистрироваться
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <img src="/logo.png" alt="Kurox" width={40} height={40} className="rounded-xl" />
            <span className="text-2xl font-black text-[#c4b5fd]">KUROX</span>
          </Link>
          <h1 className="text-xl font-bold mt-2">Войти в аккаунт</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Добро пожаловать обратно</p>
        </div>
        <Suspense fallback={<div className="h-64 shimmer rounded-2xl" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
