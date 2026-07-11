"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { MessageSquare, Trash2, Loader2, Send } from "lucide-react";

interface CommentUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface Comment {
  id: string;
  text: string;
  status: string;
  createdAt: string;
  user: CommentUser;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} дн. назад`;
  return new Date(dateStr).toLocaleDateString("ru");
}

function Avatar({ user }: { user: CommentUser }) {
  if (user.image) {
    return (
      <img
        src={user.image}
        alt={user.name || "Пользователь"}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
      {(user.name || "?")[0].toUpperCase()}
    </div>
  );
}

interface CommentSectionProps {
  animeId: string;
}

export function CommentSection({ animeId }: CommentSectionProps) {
  const { data: session, status } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchComments = useCallback(async (cursor?: string) => {
    const url = `/api/comments?animeId=${animeId}${cursor ? `&cursor=${cursor}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    return data as { items: Comment[]; nextCursor: string | null };
  }, [animeId]);

  useEffect(() => {
    fetchComments().then((data) => {
      if (data) {
        setComments(data.items);
        setNextCursor(data.nextCursor);
      }
      setLoading(false);
    });
  }, [fetchComments]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    const data = await fetchComments(nextCursor);
    if (data) {
      setComments((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    }
    setLoadingMore(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ animeId, text: text.trim() }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || "Ошибка отправки");
      return;
    }

    setText("");
    setSuccessMsg(data.message || "Комментарий отправлен");

    // If comment is immediately approved, prepend it
    if (data.comment?.status === "APPROVED") {
      setComments((prev) => [data.comment, ...prev]);
    }
  }

  async function handleDelete(commentId: string) {
    const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold flex items-center gap-2 mb-5">
        <MessageSquare size={20} className="text-purple-400" />
        Комментарии
        {comments.length > 0 && (
          <span className="text-sm font-normal text-gray-400">({comments.length})</span>
        )}
      </h2>

      {/* Comment form */}
      <div className="mb-6">
        {status === "loading" ? (
          <div className="h-24 bg-gray-800 rounded-xl animate-pulse" />
        ) : session ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Напишите комментарий..."
              rows={3}
              maxLength={1000}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{text.length}/1000</span>
              <div className="flex items-center gap-3">
                {error && <span className="text-xs text-red-400">{error}</span>}
                {successMsg && <span className="text-xs text-green-400">{successMsg}</span>}
                <button
                  type="submit"
                  disabled={submitting || text.trim().length < 3}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  {submitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Отправить
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="bg-gray-900 rounded-xl p-5 text-center border border-gray-800">
            <p className="text-gray-400 mb-4">Войдите, чтобы оставить комментарий</p>
            <div className="flex justify-center gap-3">
              <Link
                href="/auth/login"
                className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Войти
              </Link>
              <Link
                href="/auth/register"
                className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Зарегистрироваться
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Comment list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-700 rounded w-32" />
                <div className="h-3 bg-gray-700 rounded w-full" />
                <div className="h-3 bg-gray-700 rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">
          Комментариев пока нет. Будьте первым!
        </p>
      ) : (
        <div className="space-y-5">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 group">
              <Avatar user={c.user} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">
                    {c.user.name || "Пользователь"}
                  </span>
                  <span className="text-xs text-gray-500">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed break-words">{c.text}</p>
              </div>
              {session?.user?.id === c.user.id && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 transition-all self-start flex-shrink-0"
                  aria-label="Удалить комментарий"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          {nextCursor && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
              Показать ещё
            </button>
          )}
        </div>
      )}
    </section>
  );
}
