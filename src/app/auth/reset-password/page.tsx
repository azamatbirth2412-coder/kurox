"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) setError("Ссылка недействительна");
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Пароли не совпадают"); return; }
    if (password.length < 8) { setError("Пароль минимум 8 символов"); return; }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/auth/login"), 3000);
      } else {
        setError(data.error || "Произошла ошибка");
      }
    } catch {
      setError("Ошибка сети. Попробуйте позже.");
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
          <h1 className="text-xl font-bold mt-2">Новый пароль</h1>
          <p className="text-sm text-[var(--text2)] mt-1">Введите новый пароль для вашего аккаунта</p>
        </div>

        {success ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center space-y-4">
            <CheckCircle size={48} className="mx-auto text-green-400" />
            <h2 className="text-lg font-bold">Пароль изменён!</h2>
            <p className="text-sm text-[var(--text2)]">Перенаправляем на страницу входа...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
                <AlertCircle size={15} className="flex-shrink-0" /> {error}
              </div>
            )}
            <div>
              <label className="block text-sm text-[var(--text2)] mb-1.5">Новый пароль</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Минимум 8 символов"
                  className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl pl-9 pr-10 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-white transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-[var(--text2)] mb-1.5">Подтвердите пароль</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                <input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="Повторите пароль"
                  className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
            </div>
            <button type="submit" disabled={loading || !token}
              className="w-full bg-gradient-to-r from-[var(--accent2)] to-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-[opacity,filter] duration-150 shadow-lg shadow-[var(--accent-glow)]">
              {loading ? "Сохраняем..." : "Сохранить пароль"}
            </button>
            <Link href="/auth/login" className="flex items-center justify-center text-sm text-[var(--text2)] hover:text-white transition-colors">
              Вернуться ко входу
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
