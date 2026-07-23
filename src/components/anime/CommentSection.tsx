"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Loader2, Send, ThumbsUp, ThumbsDown, Trash2 } from "lucide-react";
import { ProfileFrame } from "@/components/profile/ProfileFrame";
import { TitleBadge } from "@/components/profile/TitleBadge";

interface CommentUser {
  id: string; name: string | null; image: string | null; profileFrame?: string | null;
  activeTitle?: { name: string; emoji: string; color: string; rarity: string } | null;
}
interface Comment {
  id: string; text: string; status: string; createdAt: string;
  user: CommentUser; likes: number; dislikes: number; myVote: "LIKE" | "DISLIKE" | null;
}

type Sort = "newest" | "oldest" | "top";

const SORTS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Сначала новые" },
  { value: "oldest", label: "Сначала старые" },
  { value: "top",    label: "По рейтингу" },
];

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} дн. назад`;
  return d.toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" });
}

export function CommentSection({ animeId }: { animeId: string }) {
  const { data: session, status: authStatus } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sort, setSort]             = useState<Sort>("newest");
  const [text, setText]             = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchComments = useCallback(async (cursor?: string, s = sort) => {
    const url = `/api/comments?animeId=${animeId}&sort=${s}${cursor ? `&cursor=${cursor}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json() as Promise<{ items: Comment[]; nextCursor: string | null }>;
  }, [animeId, sort]);

  useEffect(() => {
    setLoading(true);
    fetchComments().then(data => {
      if (data) { setComments(data.items); setNextCursor(data.nextCursor); }
      setLoading(false);
    });
  }, [fetchComments]);

  async function changeSort(s: Sort) {
    setSort(s);
    setLoading(true);
    const data = await fetchComments(undefined, s);
    if (data) { setComments(data.items); setNextCursor(data.nextCursor); }
    setLoading(false);
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    const data = await fetchComments(nextCursor);
    if (data) { setComments(p => [...p, ...data.items]); setNextCursor(data.nextCursor); }
    setLoadingMore(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true); setError(""); setSuccessMsg("");
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animeId, text: text.trim() }),
      });
      // Non-JSON responses (plain-text 429 from the global rate limiter) must
      // not crash the handler and leave the button stuck in "submitting"
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Ошибка"); return; }
      setText("");
      setSuccessMsg(data.message || "Отправлено");
      if (data.comment?.status === "APPROVED") {
        setComments(p => [{ ...data.comment, likes: 0, dislikes: 0, myVote: null }, ...p]);
      }
    } catch {
      setError("Не удалось отправить. Проверьте соединение.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) setComments(p => p.filter(c => c.id !== id));
  }

  async function handleVote(commentId: string, type: "LIKE" | "DISLIKE") {
    if (!session) return;
    const res = await fetch(`/api/comments/${commentId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    if (!res.ok) return;
    const data = await res.json() as { likes: number; dislikes: number; myVote: string | null };
    setComments(p => p.map(c => c.id === commentId
      ? { ...c, likes: data.likes, dislikes: data.dislikes, myVote: data.myVote as "LIKE" | "DISLIKE" | null }
      : c
    ));
  }

  const total = comments.length;

  return (
    <section className="mt-6">
      {/* Header with count + sort */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-base font-bold flex items-center gap-2">
          Комментарии
          <span className="text-sm font-normal text-[var(--text3)] bg-[var(--surface2)] px-2 py-0.5 rounded-full">
            {total}
          </span>
        </h2>

        {/* Sort buttons */}
        <div className="flex gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1">
          {SORTS.map(s => (
            <button
              key={s.value}
              onClick={() => changeSort(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-[color,background-color,box-shadow] duration-150 ${
                sort === s.value
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-[var(--text2)] hover:text-white hover:bg-[var(--surface2)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comment form */}
      <div className="mb-5">
        {authStatus === "loading" ? (
          <div className="h-24 bg-[var(--surface)] rounded-xl animate-pulse" />
        ) : session ? (
          <form onSubmit={handleSubmit}>
            <div className="flex gap-3">
              <ProfileFrame
                image={session.user?.image ?? null}
                name={session.user?.name ?? "?"}
                frame={(session.user as any)?.profileFrame ?? "default"}
                size="sm"
              />
              <div className="flex-1">
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Напишите комментарий..."
                  rows={3}
                  maxLength={1000}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 resize-none transition-colors placeholder:text-[var(--text3)]"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-[var(--text3)]">{text.length}/1000</span>
                  <div className="flex items-center gap-2">
                    {error && <span className="text-xs text-red-400">{error}</span>}
                    {successMsg && <span className="text-xs text-green-400">{successMsg}</span>}
                    <button
                      type="submit"
                      disabled={submitting || text.trim().length < 3}
                      className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                    >
                      {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      Отправить
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 text-center">
            <p className="text-[var(--text2)] text-sm mb-4">Войдите, чтобы оставить комментарий</p>
            <div className="flex justify-center gap-3">
              <Link href="/auth/login" className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors">
                Войти
              </Link>
              <Link href="/auth/register" className="bg-[var(--surface2)] hover:bg-[var(--surface3)] text-[var(--text)] px-5 py-2 rounded-xl text-sm font-medium transition-colors">
                Регистрация
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Comment list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface2)] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-[var(--surface2)] rounded w-32" />
                <div className="h-3 bg-[var(--surface2)] rounded w-full" />
                <div className="h-3 bg-[var(--surface2)] rounded w-3/5" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-10 text-[var(--text3)] text-sm">
          Комментариев пока нет. Будьте первым!
        </div>
      ) : (
        <div className="space-y-1">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3 py-4 border-b border-[var(--border)] last:border-0 group">
              <ProfileFrame
                image={c.user.image}
                name={c.user.name ?? "?"}
                frame={c.user.profileFrame ?? "default"}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-violet-400 hover:text-violet-300 cursor-default">
                    {c.user.name || "Пользователь"}
                  </span>
                  {c.user.activeTitle && (
                    <TitleBadge
                      name={c.user.activeTitle.name}
                      emoji={c.user.activeTitle.emoji}
                      color={c.user.activeTitle.color}
                      rarity={c.user.activeTitle.rarity}
                      size="sm"
                    />
                  )}
                  <span className="text-xs text-[var(--text3)]">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-sm text-[var(--text2)] leading-relaxed break-words">{c.text}</p>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-2.5">
                  <button
                    onClick={() => handleVote(c.id, "LIKE")}
                    disabled={!session}
                    className={`flex items-center gap-1.5 text-xs transition-colors rounded-lg px-2 py-1 ${
                      c.myVote === "LIKE"
                        ? "text-green-400 bg-green-500/10"
                        : "text-[var(--text3)] hover:text-green-400 hover:bg-green-500/10"
                    } disabled:cursor-default`}
                  >
                    <ThumbsUp size={13} fill={c.myVote === "LIKE" ? "currentColor" : "none"} />
                    {c.likes > 0 && <span className="font-medium">{c.likes}</span>}
                  </button>
                  <button
                    onClick={() => handleVote(c.id, "DISLIKE")}
                    disabled={!session}
                    className={`flex items-center gap-1.5 text-xs transition-colors rounded-lg px-2 py-1 ${
                      c.myVote === "DISLIKE"
                        ? "text-red-400 bg-red-500/10"
                        : "text-[var(--text3)] hover:text-red-400 hover:bg-red-500/10"
                    } disabled:cursor-default`}
                  >
                    <ThumbsDown size={13} fill={c.myVote === "DISLIKE" ? "currentColor" : "none"} />
                    {c.dislikes > 0 && <span className="font-medium">{c.dislikes}</span>}
                  </button>

                  {session?.user?.id === c.user.id && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="ml-auto opacity-0 group-hover:opacity-100 p-1.5 text-[var(--text3)] hover:text-[var(--red)] transition-[color,background-color,opacity] duration-150 rounded-lg hover:bg-[var(--red-dim)]"
                      title="Удалить"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {nextCursor && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 mt-2 bg-[var(--surface)] hover:bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text2)] transition-colors flex items-center justify-center gap-2"
            >
              {loadingMore && <Loader2 size={14} className="animate-spin" />}
              Показать ещё
            </button>
          )}
        </div>
      )}
    </section>
  );
}
