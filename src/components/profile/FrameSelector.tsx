"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock, Check, Loader2, Camera, Trash2, Sparkles } from "lucide-react";
import { ProfileFrame, FRAMES, type FrameId } from "@/components/profile/ProfileFrame";
import { FRAME_UNLOCKS } from "@/lib/level";
import { ANIME_AVATARS } from "@/lib/anime-avatars";

interface FrameSelectorProps {
  currentFrame: string;
  currentImage: string | null;
  name: string;
  userLevel: number;
  isAdmin?: boolean;
}

const FRAME_IDS = (Object.keys(FRAMES) as FrameId[]).sort(
  (a, b) => (FRAME_UNLOCKS[a] ?? 0) - (FRAME_UNLOCKS[b] ?? 0)
);

function resizeToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const SIZE = 256;
      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d")!;
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2;
      const sy = (img.height - s) / 2;
      ctx.drawImage(img, sx, sy, s, s, 0, 0, SIZE, SIZE);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function FrameSelector({ currentFrame, currentImage, name, userLevel, isAdmin = false }: FrameSelectorProps) {
  const { update } = useSession();
  const router = useRouter();

  const initialFrame = currentFrame in FRAMES ? (currentFrame as FrameId) : "default";
  const [savedFrame, setSavedFrame] = useState<FrameId>(initialFrame);   // last saved to DB
  const [pendingFrame, setPendingFrame] = useState<FrameId>(initialFrame); // selected in UI
  const [hovered, setHovered] = useState<FrameId | null>(null);
  const [image, setImage] = useState<string | null>(currentImage);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [frameError, setFrameError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"frames"|"anime">("frames");
  const [applyingUrl, setApplyingUrl] = useState<string|null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewFrame = hovered ?? pendingFrame;
  const hasUnsaved = pendingFrame !== savedFrame;

  function handleSelect(frameId: FrameId) {
    if (saving) return;
    const required = FRAME_UNLOCKS[frameId] ?? 0;
    if (!isAdmin && required > userLevel) return;
    setPendingFrame(frameId);
    setSaved(false);
    setFrameError("");
  }

  async function handleSave() {
    if (saving || !hasUnsaved) return;
    setSaving(true);
    setSaved(false);
    setFrameError("");
    try {
      const res = await fetch("/api/profile/frame", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frame: pendingFrame }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFrameError(data.error || "Не удалось сохранить");
        return;
      }
      setSavedFrame(pendingFrame);
      window.dispatchEvent(new CustomEvent("profileFrameChange", { detail: pendingFrame }));
      await update({});
      router.refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setFrameError("Ошибка соединения");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const base64 = await resizeToBase64(file);
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      if (res.ok) {
        setImage(base64);
        await update({});
      }
    } catch {
      // silent
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function openAnimeTab() {
    setTab("anime");
  }

  async function applyAnimeAvatar(avatarPath: string) {
    setApplyingUrl(avatarPath);
    try {
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localPath: avatarPath }),
      });
      if (res.ok) {
        setImage(avatarPath);
        await update({});
        router.refresh();
      }
    } catch { /* silent */ }
    finally { setApplyingUrl(null); }
  }

  async function handleAvatarDelete() {
    setUploading(true);
    try {
      await fetch("/api/user/avatar", { method: "DELETE" });
      setImage(null);
      await update({});
    } catch {
      // silent
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      {/* Large preview with camera overlay */}
      <div className="relative group mb-2">
        <ProfileFrame image={image} name={name} frame={previewFrame} size="lg" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          style={{ borderRadius: 18 }}
          aria-label="Сменить фото"
        >
          {uploading
            ? <Loader2 size={22} className="text-white animate-spin" />
            : <Camera size={22} className="text-white" />}
        </button>
      </div>

      {/* Avatar action buttons */}
      <div className="flex items-center gap-2 mb-1">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 rounded-lg transition-colors"
        >
          <Camera size={11} />
          {image ? "Изменить" : "Загрузить фото"}
        </button>
        {image && (
          <button
            type="button"
            onClick={handleAvatarDelete}
            disabled={uploading}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
          >
            <Trash2 size={11} />
            Удалить
          </button>
        )}
      </div>

      {/* Frame name + save feedback */}
      <div className="flex items-center justify-center gap-2 mb-3 min-h-[18px]">
        <span className="text-xs font-medium text-[var(--text2)]">{FRAMES[previewFrame].name}</span>
        {saved && !saving && (
          <span className="flex items-center gap-1 text-[11px] text-green-400">
            <Check size={11} /> Сохранено!
          </span>
        )}
        {frameError && !saving && <span className="text-[11px] text-red-400">{frameError}</span>}
      </div>

      {/* Save button */}
      {(hasUnsaved || saving) && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mb-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 disabled:cursor-wait text-white transition-colors shadow-lg shadow-violet-900/40"
        >
          {saving ? (
            <><Loader2 size={13} className="animate-spin" /> Сохранение...</>
          ) : (
            <><Check size={13} /> Сохранить фрейм</>
          )}
        </button>
      )}

      {/* Tabs */}
      <div className="flex w-full mb-3 bg-[var(--surface2)] rounded-xl p-1 gap-1">
        <button
          type="button"
          onClick={() => setTab("frames")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-700 transition-all ${
            tab === "frames"
              ? "bg-[var(--surface3)] text-white shadow-sm"
              : "text-[var(--text3)] hover:text-white"
          }`}
        >
          Рамки
        </button>
        <button
          type="button"
          onClick={openAnimeTab}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-700 transition-all ${
            tab === "anime"
              ? "bg-violet-600 text-white shadow-sm"
              : "text-[var(--text3)] hover:text-white"
          }`}
        >
          <Sparkles size={11} /> Аватарки
        </button>
      </div>

      {tab === "frames" && (
        <div className="grid grid-cols-4 gap-2 w-full">
          {FRAME_IDS.map((frameId) => {
            const required = FRAME_UNLOCKS[frameId] ?? 0;
            const locked = !isAdmin && required > userLevel;
            const isPending = frameId === pendingFrame;
            const isSavedInDB = frameId === savedFrame;
            return (
              <button
                key={frameId}
                type="button"
                onClick={() => handleSelect(frameId)}
                onMouseEnter={() => setHovered(frameId)}
                onMouseLeave={() => setHovered(null)}
                disabled={locked}
                title={locked ? `Откроется на уровне ${required}` : FRAMES[frameId].name}
                className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-[border-color,background-color,box-shadow,opacity] duration-200 ${
                  isPending
                    ? "border-violet-500 bg-violet-500/10 shadow-[0_0_14px_rgba(139,92,246,0.3)]"
                    : locked
                      ? "border-[var(--border)] bg-[var(--surface2)] opacity-50 cursor-not-allowed"
                      : "border-[var(--border)] bg-[var(--surface2)] hover:border-violet-500/50 hover:bg-[var(--surface3)] cursor-pointer"
                }`}
              >
                <ProfileFrame image={image} name={name} frame={frameId} size="sm" />
                <span className="text-[10px] leading-tight text-[var(--text2)] truncate w-full text-center">
                  {FRAMES[frameId].name}
                </span>
                {locked && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 bg-black/70 border border-white/10 rounded-full px-1.5 py-0.5">
                    <Lock size={9} className="text-yellow-400 flex-shrink-0" />
                    <span className="text-[9px] font-bold text-yellow-400">{required}</span>
                  </span>
                )}
                {!locked && isSavedInDB && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-green-600 flex items-center justify-center">
                    <Check size={10} className="text-white" />
                  </span>
                )}
                {!locked && isPending && !isSavedInDB && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {tab === "anime" && (
        <div className="w-full">
          <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto">
            {ANIME_AVATARS.map(a => {
              const isApplying = applyingUrl === a.url;
              const isActive = image === a.url;
              return (
                <button key={a.id} type="button"
                  onClick={() => applyAnimeAvatar(a.url)}
                  disabled={!!applyingUrl}
                  title={a.name}
                  className={`relative aspect-square rounded-xl overflow-hidden border transition-all duration-200 hover:scale-105 group ${
                    isActive
                      ? "border-violet-500 shadow-[0_0_14px_rgba(139,92,246,0.6)]"
                      : "border-[var(--border)] hover:border-violet-400/60"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
                  {isApplying && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 size={16} className="text-white animate-spin" />
                    </div>
                  )}
                  {isActive && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </span>
                  )}
                  <p className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-white text-center py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {a.name}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-[var(--text3)] text-center mt-2">24 аниме аватарки</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFile}
      />
    </div>
  );
}
