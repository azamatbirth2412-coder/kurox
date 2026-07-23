"use client";

import { useState } from "react";
import { Shield, Ban, Trash2, UserCheck, ShieldOff, Loader2, Eye, EyeOff } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  bannedAt: Date | null;
  banReason: string | null;
  createdAt: Date;
  _count: { comments: number };
  hasSecretAgent?: boolean;
}

const dateFmt = new Intl.DateTimeFormat("ru", { day: "numeric", month: "long", year: "numeric" });

export function UserManagement({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState<string | null>(null);
  const [agentMsg, setAgentMsg] = useState<string | null>(null);
  const [banModal, setBanModal] = useState<{ userId: string; name: string } | null>(null);
  const [banReason, setBanReason] = useState("Нарушение правил");

  async function doAction(userId: string, action: string, reason?: string) {
    setLoading(userId + action);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: action !== "delete" ? JSON.stringify({ action, reason }) : undefined,
      });
      if (!res.ok) throw new Error();

      if (action === "delete") {
        setUsers(u => u.filter(x => x.id !== userId));
      } else if (action === "grantTitle") {
        setUsers(u => u.map(x => x.id === userId ? { ...x, hasSecretAgent: true } : x));
        setAgentMsg("👁 Титул «ТАЙНЫЙ АГЕНТ» выдан");
        setTimeout(() => setAgentMsg(null), 3000);
      } else if (action === "revokeTitle") {
        setUsers(u => u.map(x => x.id === userId ? { ...x, hasSecretAgent: false } : x));
        setAgentMsg("Титул «ТАЙНЫЙ АГЕНТ» отозван");
        setTimeout(() => setAgentMsg(null), 3000);
      } else {
        setUsers(u => u.map(x => {
          if (x.id !== userId) return x;
          if (action === "ban") return { ...x, role: "BANNED", bannedAt: new Date(), banReason: reason ?? null };
          if (action === "unban") return { ...x, role: "USER", bannedAt: null, banReason: null };
          if (action === "makeAdmin") return { ...x, role: "ADMIN" };
          if (action === "removeAdmin") return { ...x, role: "USER" };
          return x;
        }));
      }
    } catch {
      alert("Ошибка операции");
    } finally {
      setLoading(null);
    }
  }

  function confirmBan() {
    if (!banModal) return;
    doAction(banModal.userId, "ban", banReason);
    setBanModal(null);
    setBanReason("Нарушение правил");
  }

  return (
    <>
      {/* Toast */}
      {agentMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm shadow-xl">
          {agentMsg}
        </div>
      )}

      {/* Ban reason modal */}
      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-1">Заблокировать пользователя</h3>
            <p className="text-sm text-[var(--text2)] mb-4">{banModal.name}</p>
            <label className="block text-xs text-[var(--text3)] mb-1.5 font-medium uppercase tracking-wide">Причина блокировки</label>
            <input
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setBanModal(null)} className="px-4 py-2 text-sm text-[var(--text2)] hover:text-white transition-colors">Отмена</button>
              <button onClick={confirmBan} className="px-4 py-2 text-sm font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 rounded-xl transition-all">
                Заблокировать
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="divide-y divide-[var(--border)]">
        {users.length === 0 ? (
          <div className="px-5 py-12 text-center text-[var(--text2)] text-sm">Нет пользователей</div>
        ) : users.map((u) => {
          const isBanned = u.role === "BANNED";
          const isAdmin = u.role === "ADMIN";
          const busy = loading?.startsWith(u.id);

          return (
            <div key={u.id} className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-5 py-3.5 items-center hover:bg-violet-500/5 transition-colors ${isBanned ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isBanned ? "bg-red-500/20 text-red-400" : "bg-gradient-to-br from-violet-500 to-purple-700"}`}>
                  {(u.name?.[0] || u.email[0]).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{u.name || "—"}</div>
                  <div className="text-xs text-[var(--text3)] truncate">{u.email}</div>
                  {isBanned && u.banReason && (
                    <div className="text-[10px] text-red-400 truncate">Причина: {u.banReason}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center">
                {isAdmin ? (
                  <span className="flex items-center gap-1 text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-lg font-medium whitespace-nowrap">
                    <Shield size={11} /> Админ
                  </span>
                ) : isBanned ? (
                  <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-lg font-medium whitespace-nowrap">
                    <Ban size={11} /> Бан
                  </span>
                ) : (
                  <span className="text-xs text-[var(--text3)]">Юзер</span>
                )}
              </div>

              <div className="text-center text-sm text-[var(--text2)] w-8">{u._count.comments}</div>

              <div className="text-xs text-[var(--text3)] whitespace-nowrap text-right">{dateFmt.format(new Date(u.createdAt))}</div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {!isBanned && !isAdmin && (
                  <button
                    onClick={() => setBanModal({ userId: u.id, name: u.name || u.email })}
                    disabled={!!busy}
                    title="Заблокировать"
                    className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 flex items-center justify-center transition-all disabled:opacity-40"
                  >
                    {busy && loading === u.id + "ban" ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                  </button>
                )}
                {isBanned && (
                  <button
                    onClick={() => doAction(u.id, "unban")}
                    disabled={!!busy}
                    title="Разблокировать"
                    className="w-8 h-8 rounded-lg bg-green-500/10 hover:bg-green-500/25 text-green-400 flex items-center justify-center transition-all disabled:opacity-40"
                  >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
                  </button>
                )}
                {!isBanned && !isAdmin && (
                  <button
                    onClick={() => doAction(u.id, "makeAdmin")}
                    disabled={!!busy}
                    title="Сделать админом"
                    className="w-8 h-8 rounded-lg bg-purple-500/10 hover:bg-purple-500/25 text-purple-400 flex items-center justify-center transition-all disabled:opacity-40"
                  >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <Shield size={13} />}
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => doAction(u.id, "removeAdmin")}
                    disabled={!!busy}
                    title="Снять права админа"
                    className="w-8 h-8 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/25 text-yellow-400 flex items-center justify-center transition-all disabled:opacity-40"
                  >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldOff size={13} />}
                  </button>
                )}
                <button
                  onClick={() => doAction(u.id, u.hasSecretAgent ? "revokeTitle" : "grantTitle", "secret_agent")}
                  disabled={!!busy}
                  title={u.hasSecretAgent ? "Отозвать ТАЙНЫЙ АГЕНТ" : "Выдать ТАЙНЫЙ АГЕНТ"}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 ${
                    u.hasSecretAgent
                      ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                      : "bg-[var(--surface2)] text-[var(--text3)] hover:bg-cyan-500/10 hover:text-cyan-400"
                  }`}
                >
                  {busy && (loading === u.id + "grantTitle" || loading === u.id + "revokeTitle")
                    ? <Loader2 size={13} className="animate-spin" />
                    : u.hasSecretAgent ? <Eye size={13} /> : <EyeOff size={13} />
                  }
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Удалить пользователя ${u.name || u.email}?`)) doAction(u.id, "delete");
                  }}
                  disabled={!!busy}
                  title="Удалить"
                  className="w-8 h-8 rounded-lg bg-[var(--surface2)] hover:bg-red-500/20 text-[var(--text3)] hover:text-red-400 flex items-center justify-center transition-all disabled:opacity-40"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
