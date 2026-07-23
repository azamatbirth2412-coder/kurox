"use client";

import { useState } from "react";
import { Gift, Loader2, Plus, Trash2 } from "lucide-react";
import { TitleBadge } from "@/components/profile/TitleBadge";

export interface AdminTitle {
  id: string;
  key: string;
  name: string;
  emoji: string;
  color: string;
  rarity: string;
  description: string | null;
  animeSlug: string | null;
  minEpisodes: number;
  owners: number;
}

const RARITY_LABELS: Record<string, string> = {
  common: "Обычный",
  rare: "Редкий",
  epic: "Эпический",
  legendary: "Легендарный",
};

const RARITY_BADGE_CLASSES: Record<string, string> = {
  common: "bg-gray-500/15 border-gray-500/30 text-gray-400",
  rare: "bg-blue-500/15 border-blue-500/30 text-blue-400",
  epic: "bg-violet-500/15 border-violet-500/30 text-violet-400",
  legendary: "bg-amber-500/15 border-amber-500/30 text-amber-400",
};

const EMPTY_FORM = {
  key: "",
  name: "",
  emoji: "🏅",
  color: "#8b5cf6",
  rarity: "common",
  description: "",
  animeSlug: "",
  minEpisodes: 1,
};

const inputClass =
  "w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors placeholder:text-[var(--text3)]";

export function TitleManagement({ initialTitles }: { initialTitles: AdminTitle[] }) {
  const [titles, setTitles] = useState<AdminTitle[]>(initialTitles);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Per-row award state
  const [awardOpenId, setAwardOpenId] = useState<string | null>(null);
  const [awardIdentifier, setAwardIdentifier] = useState("");
  const [awardBusy, setAwardBusy] = useState(false);
  const [awardMsg, setAwardMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function setField<K extends keyof typeof EMPTY_FORM>(field: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError("");
    setFormSuccess("");
    try {
      const res = await fetch("/api/admin/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, minEpisodes: String(form.minEpisodes) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error || "Не удалось создать титул");
        return;
      }
      setTitles((p) => [{ ...data, owners: 0 }, ...p]);
      setForm(EMPTY_FORM);
      setFormSuccess(`Титул «${data.name}» создан`);
    } catch {
      setFormError("Не удалось создать. Проверьте соединение.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/titles/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTitles((p) => p.filter((t) => t.id !== id));
        if (awardOpenId === id) setAwardOpenId(null);
      }
    } finally {
      setDeletingId(null);
    }
  }

  function toggleAward(id: string) {
    setAwardMsg(null);
    setAwardIdentifier("");
    setAwardOpenId((cur) => (cur === id ? null : id));
  }

  async function handleAward(id: string) {
    const identifier = awardIdentifier.trim();
    if (!identifier) return;
    setAwardBusy(true);
    setAwardMsg(null);
    try {
      const res = await fetch(`/api/admin/titles/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAwardMsg({ id, text: data.error || "Ошибка выдачи", ok: false });
        return;
      }
      setTitles((p) => p.map((t) => (t.id === id ? { ...t, owners: t.owners + 1 } : t)));
      setAwardMsg({ id, text: `Выдан: ${data.user?.name || data.user?.email || identifier}`, ok: true });
      setAwardIdentifier("");
    } catch {
      setAwardMsg({ id, text: "Не удалось выдать. Проверьте соединение.", ok: false });
    } finally {
      setAwardBusy(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
      {/* Create form */}
      <form
        onSubmit={handleCreate}
        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4"
      >
        <h2 className="text-base font-bold flex items-center gap-2">
          <Plus size={16} className="text-violet-400" /> Новый титул
        </h2>

        <div>
          <label className="block text-xs text-[var(--text2)] mb-1.5" htmlFor="title-key">Ключ *</label>
          <input
            id="title-key"
            value={form.key}
            onChange={(e) => setField("key", e.target.value)}
            placeholder="first_watcher"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs text-[var(--text2)] mb-1.5" htmlFor="title-name">Название *</label>
          <input
            id="title-name"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Первопроходец"
            required
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[var(--text2)] mb-1.5" htmlFor="title-emoji">Эмодзи</label>
            <input
              id="title-emoji"
              value={form.emoji}
              onChange={(e) => setField("emoji", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text2)] mb-1.5" htmlFor="title-color">Цвет</label>
            <input
              id="title-color"
              type="color"
              value={form.color}
              onChange={(e) => setField("color", e.target.value)}
              className="w-full h-[38px] bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-1.5 py-1 cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-[var(--text2)] mb-1.5" htmlFor="title-rarity">Редкость</label>
          <select
            id="title-rarity"
            value={form.rarity}
            onChange={(e) => setField("rarity", e.target.value)}
            className={inputClass}
          >
            {Object.entries(RARITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-[var(--text2)] mb-1.5" htmlFor="title-description">Описание</label>
          <textarea
            id="title-description"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label className="block text-xs text-[var(--text2)] mb-1.5" htmlFor="title-anime-slug">Аниме</label>
          <input
            id="title-anime-slug"
            value={form.animeSlug}
            onChange={(e) => setField("animeSlug", e.target.value)}
            placeholder="naruto"
            className={inputClass}
          />
          <p className="text-[11px] text-[var(--text3)] mt-1">slug аниме для авто-выдачи</p>
        </div>

        <div>
          <label className="block text-xs text-[var(--text2)] mb-1.5" htmlFor="title-min-episodes">Мин. эпизодов</label>
          <input
            id="title-min-episodes"
            type="number"
            min={1}
            value={form.minEpisodes}
            onChange={(e) => setField("minEpisodes", Math.max(1, parseInt(e.target.value) || 1))}
            className={inputClass}
          />
        </div>

        {/* Live preview */}
        <div className="flex items-center gap-2 text-xs text-[var(--text3)]">
          Превью:
          <TitleBadge
            name={form.name || "Название"}
            emoji={form.emoji || "🏅"}
            color={form.color}
            rarity={form.rarity}
            size="md"
          />
        </div>

        {formError && <p className="text-xs text-red-400">{formError}</p>}
        {formSuccess && <p className="text-xs text-green-400">{formSuccess}</p>}

        <button
          type="submit"
          disabled={creating || !form.key.trim() || !form.name.trim()}
          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Создать титул
        </button>
      </form>

      {/* Title list */}
      <div className="space-y-3">
        {titles.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center text-sm text-[var(--text3)]">
            Титулов пока нет. Создайте первый.
          </div>
        ) : (
          titles.map((t) => (
            <div key={t.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <TitleBadge name={t.name} emoji={t.emoji} color={t.color} rarity={t.rarity} size="md" />
                <span className={`text-[11px] font-semibold border px-2 py-0.5 rounded-full ${RARITY_BADGE_CLASSES[t.rarity] ?? RARITY_BADGE_CLASSES.common}`}>
                  {RARITY_LABELS[t.rarity] ?? t.rarity}
                </span>
                <span className="text-xs text-[var(--text3)]">
                  Владельцев: <span className="font-semibold text-[var(--text2)]">{t.owners}</span>
                </span>
                {t.animeSlug && (
                  <span className="text-[11px] text-[var(--text3)] bg-[var(--surface2)] border border-[var(--border)] px-2 py-0.5 rounded-full">
                    {t.animeSlug} · от {t.minEpisodes} эп.
                  </span>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAward(t.id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-[var(--text2)] hover:text-white bg-[var(--surface2)] hover:bg-[var(--surface3)] border border-[var(--border)] px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <Gift size={13} /> Выдать
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {deletingId === t.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    Удалить
                  </button>
                </div>
              </div>

              {t.description && (
                <p className="text-xs text-[var(--text3)] mt-2">{t.description}</p>
              )}

              {awardOpenId === t.id && (
                <div className="mt-3 pt-3 border-t border-[var(--border)]">
                  <div className="flex gap-2">
                    <input
                      value={awardIdentifier}
                      onChange={(e) => setAwardIdentifier(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAward(t.id); } }}
                      placeholder="email или имя пользователя"
                      className={inputClass}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleAward(t.id)}
                      disabled={awardBusy || !awardIdentifier.trim()}
                      className="flex-shrink-0 flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-medium transition-colors"
                    >
                      {awardBusy ? <Loader2 size={13} className="animate-spin" /> : <Gift size={13} />}
                      Выдать
                    </button>
                  </div>
                  {awardMsg?.id === t.id && (
                    <p className={`text-xs mt-2 ${awardMsg.ok ? "text-green-400" : "text-red-400"}`}>
                      {awardMsg.text}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
