"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Ошибка регистрации");
    } else {
      router.push("/auth/login?registered=1");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black text-purple-500">KUROX</Link>
          <h1 className="text-xl font-bold mt-4">Создать аккаунт</h1>
        </div>
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}
          <div>
            <label htmlFor="name" className="block text-sm text-gray-400 mb-1">Имя</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500"
              placeholder="Ваше имя" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm text-gray-400 mb-1">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500"
              placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-gray-400 mb-1">Пароль (минимум 6 символов)</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500"
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors">
            {loading ? "Регистрация..." : "Создать аккаунт"}
          </button>
          <p className="text-center text-sm text-gray-400">
            Уже есть аккаунт?{" "}
            <Link href="/auth/login" className="text-purple-400 hover:underline">Войти</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
