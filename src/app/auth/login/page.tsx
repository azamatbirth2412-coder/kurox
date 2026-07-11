"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Неверный email или пароль");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black text-purple-500">KUROX</Link>
          <h1 className="text-xl font-bold mt-4">Войти в аккаунт</h1>
        </div>
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm text-gray-400 mb-1">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500"
              placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-gray-400 mb-1">Пароль</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500"
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors">
            {loading ? "Входим..." : "Войти"}
          </button>
          <p className="text-center text-sm text-gray-400">
            Нет аккаунта?{" "}
            <Link href="/auth/register" className="text-purple-400 hover:underline">Зарегистрироваться</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
