"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

type Step = "email" | "code" | "password" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 1: send code
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.previewUrl) setDevCode(data.previewUrl);
        setStep("code");
      } else {
        setError(data.error || "Ошибка");
      }
    } catch { setError("Ошибка сети"); }
    finally { setLoading(false); }
  }

  // Step 2: verify code
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length < 6) { setError("Введите 6-значный код"); return; }
    setStep("password");
    setError("");
  }

  // Step 3: set new password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Пароль минимум 8 символов"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.join(""), password }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("done");
        setTimeout(() => router.push("/auth/login"), 2500);
      } else {
        setError(data.error || "Ошибка");
        if (data.error?.includes("код")) setStep("code");
      }
    } catch { setError("Ошибка сети"); }
    finally { setLoading(false); }
  }

  function handleCodeInput(i: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[i] = val.slice(-1);
    setCode(next);
    if (val && i < 5) codeRefs.current[i + 1]?.focus();
  }

  function handleCodeKey(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[i] && i > 0) codeRefs.current[i - 1]?.focus();
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      codeRefs.current[5]?.focus();
    }
    e.preventDefault();
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <img src="/logo.png" alt="Kurox" width={40} height={40} className="rounded-xl" />
            <span className="text-2xl font-black text-[#c4b5fd]">KUROX</span>
          </Link>

          {/* Steps indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {(["email", "code", "password"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s ? "bg-[var(--accent)] text-white scale-110" :
                  (["email","code","password","done"].indexOf(step) > i) ? "bg-violet-900 text-violet-300" :
                  "bg-[var(--surface2)] text-[var(--text3)]"
                }`}>{i + 1}</div>
                {i < 2 && <div className={`w-8 h-0.5 ${(["email","code","password","done"].indexOf(step) > i) ? "bg-violet-700" : "bg-[var(--border)]"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* ── Step 1: Email ── */}
        {step === "email" && (
          <form onSubmit={handleSendCode} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <div className="text-center mb-2">
              <h1 className="text-lg font-bold">Восстановление пароля</h1>
              <p className="text-sm text-[var(--text2)] mt-1">Введите email — отправим код</p>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>}
            <div>
              <label className="block text-sm text-[var(--text2)] mb-1.5">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@example.com"
                  className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-[var(--accent2)] to-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-[opacity,filter] duration-150 shadow-lg shadow-[var(--accent-glow)]">
              {loading ? "Отправляем..." : "Получить код"}
            </button>
            <Link href="/auth/login" className="flex items-center justify-center gap-1.5 text-sm text-[var(--text2)] hover:text-white transition-colors">
              <ArrowLeft size={13} /> Вернуться ко входу
            </Link>
          </form>
        )}

        {/* ── Step 2: Code ── */}
        {step === "code" && (
          <form onSubmit={handleVerifyCode} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
            <div className="text-center">
              <ShieldCheck size={40} className="mx-auto text-violet-400 mb-3" />
              <h1 className="text-lg font-bold">Введите код</h1>
              <p className="text-sm text-[var(--text2)] mt-1">
                Код отправлен на <strong className="text-[var(--text)]">{email}</strong>
              </p>
              {devCode && (
                <div className="mt-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg px-3 py-2 text-xs">
                  SMTP не настроен.{" "}
                  <a href={devCode} target="_blank" rel="noreferrer" className="underline font-semibold">
                    Открыть письмо (dev)
                  </a>
                </div>
              )}
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm text-center">{error}</div>}

            {/* 6 digit boxes */}
            <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
              {code.map((d, i) => (
                <input
                  key={i}
                  ref={el => { codeRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleCodeInput(i, e.target.value)}
                  onKeyDown={e => handleCodeKey(i, e)}
                  className="w-12 h-14 text-center text-2xl font-bold bg-[var(--surface2)] border-2 border-[var(--border)] focus:border-[var(--accent)] rounded-xl outline-none transition-colors"
                />
              ))}
            </div>

            <button type="submit"
              className="w-full bg-gradient-to-r from-[var(--accent2)] to-[var(--accent)] hover:brightness-110 text-white py-3 rounded-xl font-semibold transition-[filter] duration-150 shadow-lg shadow-[var(--accent-glow)]">
              Подтвердить
            </button>
            <button type="button" onClick={() => { setStep("email"); setCode(["","","","","",""]); setError(""); }}
              className="flex items-center justify-center gap-1.5 w-full text-sm text-[var(--text2)] hover:text-white transition-colors">
              <ArrowLeft size={13} /> Изменить email
            </button>
          </form>
        )}

        {/* ── Step 3: New password ── */}
        {step === "password" && (
          <form onSubmit={handleResetPassword} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <div className="text-center mb-2">
              <Lock size={36} className="mx-auto text-violet-400 mb-3" />
              <h1 className="text-lg font-bold">Новый пароль</h1>
              <p className="text-sm text-[var(--text2)] mt-1">Придумайте надёжный пароль</p>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>}
            <div>
              <label className="block text-sm text-[var(--text2)] mb-1.5">Новый пароль</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  required minLength={8} placeholder="Минимум 8 символов"
                  className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl pl-9 pr-10 py-3 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-white transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-[var(--accent2)] to-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-[opacity,filter] duration-150 shadow-lg shadow-[var(--accent-glow)]">
              {loading ? "Сохраняем..." : "Сохранить пароль"}
            </button>
          </form>
        )}

        {/* ── Done ── */}
        {step === "done" && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center space-y-4">
            <CheckCircle size={52} className="mx-auto text-green-400" />
            <h2 className="text-lg font-bold">Пароль изменён!</h2>
            <p className="text-sm text-[var(--text2)]">Перенаправляем на страницу входа...</p>
          </div>
        )}

      </div>
    </div>
  );
}
