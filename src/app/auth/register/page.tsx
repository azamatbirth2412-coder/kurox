"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      // Non-JSON responses (e.g. plain-text 429 from the rate limiter) must not
      // crash the handler and leave the button stuck in "loading"
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || (res.status === 429 ? "Слишком много попыток. Попробуйте через минуту." : "Ошибка регистрации"));
      } else {
        router.push("/auth/login?registered=1");
      }
    } catch {
      setError("Не удалось связаться с сервером. Проверьте соединение.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <img src="/logo.png" alt="Kurox" width={40} height={40} className="rounded-xl" />
            <span className="text-2xl font-black text-[#c4b5fd]">KUROX</span>
          </Link>
          <h1 className="text-xl font-bold mt-2">Создать аккаунт</h1>
          <p className="text-sm text-[var(--text2)] mt-1">Регистрация займёт меньше минуты</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm text-[var(--text2)] mb-1.5">
              Имя пользователя
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="Ваше имя"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm text-[var(--text2)] mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-[var(--text2)] mb-1.5">
              Пароль <span className="text-[var(--text3)]">(минимум 8 символов)</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm text-[var(--text2)] mb-1.5">
              Подтвердите пароль
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[var(--accent2)] to-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-[opacity,filter] duration-150 shadow-lg shadow-[var(--accent-glow)]"
          >
            {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
          </button>

          <p className="text-center text-sm text-[var(--text2)]">
            Уже есть аккаунт?{" "}
            <Link href="/auth/login" className="text-[var(--accent)] hover:text-[var(--text)] transition-colors">
              Войти
            </Link>
          </p>
        </form>

        <p className="text-center text-xs text-[var(--text3)] mt-4">
          Регистрируясь, вы соглашаетесь с условиями использования сервиса
        </p>
      </div>
    </div>
  );
}
