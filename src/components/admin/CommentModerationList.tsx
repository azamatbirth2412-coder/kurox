"use client";
import { useState } from "react";
import { Check, X, Trash2 } from "lucide-react";

interface Comment {
  id: string;
  text: string;
  status: string;
  createdAt: Date;
  user: { name: string | null; email: string };
  anime: { title: string; id: string };
}

export function CommentModerationList({ initialComments }: { initialComments: Comment[] }) {
  const [comments, setComments] = useState(initialComments);

  async function moderate(id: string, action: "approve" | "reject" | "delete") {
    await fetch(`/api/admin/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  if (comments.length === 0) {
    return <p className="text-gray-400">Нет комментариев на модерации.</p>;
  }

  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <div key={c.id} className="bg-gray-900 rounded-xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-400 flex-wrap">
                <span className="font-medium text-gray-200">{c.user.name || c.user.email}</span>
                <span>·</span>
                <span className="truncate">{c.anime.title}</span>
                <span>·</span>
                <span>{new Date(c.createdAt).toLocaleDateString("ru")}</span>
              </div>
              <p className="text-sm">{c.text}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => moderate(c.id, "approve")}
                className="p-2 bg-green-700/30 hover:bg-green-700/50 text-green-400 rounded-lg transition-colors" title="Одобрить">
                <Check size={16} />
              </button>
              <button onClick={() => moderate(c.id, "reject")}
                className="p-2 bg-yellow-700/30 hover:bg-yellow-700/50 text-yellow-400 rounded-lg transition-colors" title="Отклонить">
                <X size={16} />
              </button>
              <button onClick={() => moderate(c.id, "delete")}
                className="p-2 bg-red-700/30 hover:bg-red-700/50 text-red-400 rounded-lg transition-colors" title="Удалить">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
