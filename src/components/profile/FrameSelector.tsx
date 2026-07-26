"use client";

import { useState, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock, Check, Loader2, Camera, Trash2, Sparkles, Crown } from "lucide-react";
import { ProfileFrame, FRAMES, type FrameId } from "@/components/profile/ProfileFrame";
import { FRAME_UNLOCKS } from "@/lib/level";
import { AVATAR_CATALOG, STATIC_AVATARS, ANIMATED_AVATARS, isAvatarUnlocked, type AvatarDef, type AvatarKind } from "@/lib/anime-avatars";
import { RARITY, RARITY_ORDER, frameRarity, type Rarity } from "@/lib/rarity";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

interface FrameSelectorProps {
  currentFrame: string;
  currentImage: string | null;
  name: string;
  userLevel: number;
  isPremium?: boolean;
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

export function FrameSelector({ currentFrame, currentImage, name, userLevel, isPremium = false, isAdmin = false }: FrameSelectorProps) {
  const { update } = useSession();
  const router = useRouter();
  const reducedMotion = usePrefersReducedMotion();

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
  const [avatarKind, setAvatarKind] = useState<AvatarKind | "all">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewFrame = hovered ?? pendingFrame;
  const hasUnsaved = pendingFrame !== savedFrame;
  const unlockedCount = FRAME_IDS.filter(f => isAdmin || (FRAME_UNLOCKS[f] ?? 0) <= userLevel).length;

  // Avatars grouped by rarity (filtered by kind), sorted by unlock level.
  const avatarsByRarity = useMemo(() => {
    const visible = avatarKind === "all"
      ? AVATAR_CATALOG
      : AVATAR_CATALOG.filter(a => a.kind === avatarKind);
    const map: Record<Rarity, AvatarDef[]> = { legendary: [], epic: [], rare: [], common: [] };
    for (const a of visible) map[a.rarity].push(a);
    for (const r of RARITY_ORDER) map[r].sort((x, y) => x.unlockLevel - y.unlockLevel);
    return map;
  }, [avatarKind]);
  const unlockedAvatarCount = useMemo(
    () => AVATAR_CATALOG.filter(a => isAvatarUnlocked(a, userLevel, isPremium, isAdmin)).length,
    [userLevel, isPremium, isAdmin]
  );

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

      {/* Frame name + rarity badge + save feedback */}
      <div className="flex flex-col items-center gap-1.5 mb-3 min-h-[18px]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--text)]">{FRAMES[previewFrame].name}</span>
          {(() => {
            const rarity = frameRarity(FRAME_UNLOCKS[previewFrame] ?? 0);
            const rm = RARITY[rarity];
            const isLeg = rarity === "legendary";
            return (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${isLeg ? "rarity-legendary-border" : ""}`}
                style={{
                  color: rm.color,
                  background: `${rm.color}1f`,
                  border: `1px solid ${rm.color}55`,
                  boxShadow: isLeg ? `0 0 12px ${rm.glow}` : undefined,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: rm.color, boxShadow: `0 0 6px ${rm.color}` }} />
                {rm.label}
              </span>
            );
          })()}
        </div>
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
          className={`flex-1 py-1.5 rounded-lg text-xs font-700 transition-colors ${
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
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-700 transition-colors ${
            tab === "anime"
              ? "bg-violet-600 text-white shadow-sm"
              : "text-[var(--text3)] hover:text-white"
          }`}
        >
          <Sparkles size={11} /> Аватарки
        </button>
      </div>

      {tab === "frames" && (
        <div className="w-full">
          {/* Header: unlocked counter */}
          <div className="flex items-center justify-between mb-2 px-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text3)]">Коллекция рамок</span>
            <span className="text-[10px] font-extrabold text-[var(--text2)] tabular-nums">
              Открыто {unlockedCount}/{FRAME_IDS.length}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 w-full">
            {FRAME_IDS.map((frameId) => {
              const required = FRAME_UNLOCKS[frameId] ?? 0;
              const locked = !isAdmin && required > userLevel;
              const isPending = frameId === pendingFrame;
              const isSavedInDB = frameId === savedFrame;
              const rarity = frameRarity(required);
              const rm = RARITY[rarity];
              const isLeg = rarity === "legendary";
              const isHovered = hovered === frameId;

              const borderColor = isPending
                ? rm.color
                : locked
                  ? `${rm.color}26`
                  : isHovered
                    ? rm.color
                    : `${rm.color}44`;
              const boxShadow = isPending
                ? `0 0 16px ${rm.glow}, inset 0 0 0 1px ${rm.color}`
                : isHovered && !locked
                  ? `0 0 16px ${rm.glow}`
                  : isLeg && !locked
                    ? `0 0 10px ${rm.glow}`
                    : undefined;

              return (
                <button
                  key={frameId}
                  type="button"
                  onClick={() => handleSelect(frameId)}
                  onMouseEnter={() => setHovered(frameId)}
                  onMouseLeave={() => setHovered(null)}
                  disabled={locked}
                  title={locked ? `Откроется на уровне ${required} · ${rm.label}` : `${FRAMES[frameId].name} · ${rm.label}`}
                  className={`relative flex flex-col items-center gap-1.5 rounded-xl p-2 transition-[border-color,box-shadow,opacity,transform] duration-200 ${
                    locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:-translate-y-0.5"
                  } ${isLeg && !locked ? "rarity-legendary-border" : ""}`}
                  style={{
                    border: `1.5px solid ${borderColor}`,
                    background: isPending ? `${rm.color}14` : "var(--surface2)",
                    boxShadow,
                  }}
                >
                  <div style={{ filter: locked ? "grayscale(0.55)" : undefined, opacity: locked ? 0.65 : 1 }}>
                    <ProfileFrame image={image} name={name} frame={frameId} size="sm" />
                  </div>
                  <span
                    className="text-[10px] font-semibold leading-tight truncate w-full text-center"
                    style={{ color: locked ? "var(--text3)" : rm.color }}
                  >
                    {FRAMES[frameId].name}
                  </span>
                  {locked && (
                    <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 bg-black/80 border border-white/10 rounded-full px-1.5 py-0.5 z-10">
                      <Lock size={9} className="text-yellow-400 flex-shrink-0" />
                      <span className="text-[9px] font-bold text-yellow-400">{required}</span>
                    </span>
                  )}
                  {!locked && isSavedInDB && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-green-600 flex items-center justify-center ring-2 ring-[var(--surface)] z-10">
                      <Check size={10} className="text-white" />
                    </span>
                  )}
                  {!locked && isPending && !isSavedInDB && (
                    <span
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-[var(--surface)] z-10"
                      style={{ background: rm.color }}
                    >
                      <span className="w-2 h-2 rounded-full bg-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === "anime" && (
        <div className="w-full">
          {/* Header: unlocked counter */}
          <div className="flex items-center justify-between mb-2 px-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text3)]">Коллекция аватарок</span>
            <span className="text-[10px] font-extrabold text-[var(--text2)] tabular-nums">
              Открыто {unlockedAvatarCount}/{AVATAR_CATALOG.length}
            </span>
          </div>

          {/* Kind filter */}
          <div className="flex w-full mb-3 bg-[var(--surface2)] rounded-xl p-1 gap-1">
            {([["all","Все"],["static","Статика"],["animated","GIF"]] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setAvatarKind(k)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-700 transition-colors ${
                  avatarKind === k
                    ? "bg-[var(--surface3)] text-white shadow-sm"
                    : "text-[var(--text3)] hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Rarity-grouped avatar grid */}
          <div className="max-h-80 overflow-y-auto flex flex-col gap-3 pr-0.5">
            {RARITY_ORDER.map((rarity) => {
              const items = avatarsByRarity[rarity];
              if (!items.length) return null;
              const rm = RARITY[rarity];
              const unlockedInGroup = items.filter(a => isAvatarUnlocked(a, userLevel, isPremium, isAdmin)).length;
              return (
                <div key={rarity}>
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider"
                      style={{ color: rm.color, textShadow: `0 0 10px ${rm.color}55` }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: rm.color, boxShadow: `0 0 6px ${rm.color}` }} />
                      {rm.label}
                    </span>
                    <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${rm.color}55, transparent)` }} />
                    <span className="text-[9px] font-extrabold tabular-nums" style={{ color: rm.color }}>
                      {unlockedInGroup}/{items.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {items.map((a) => {
                      const unlocked = isAvatarUnlocked(a, userLevel, isPremium, isAdmin);
                      const isApplying = applyingUrl === a.url;
                      const isActive = image === a.url;
                      const isLeg = a.rarity === "legendary";
                      // Reduced-motion: show the still PNG frame instead of the GIF.
                      const src = reducedMotion && a.kind === "animated" ? a.still : a.url;
                      const lockTitle = a.premium
                        ? `Premium или уровень ${a.unlockLevel} · ${rm.label}`
                        : `Откроется на уровне ${a.unlockLevel} · ${rm.label}`;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => unlocked && applyAnimeAvatar(a.url)}
                          disabled={!unlocked || !!applyingUrl}
                          title={unlocked ? `${a.name} · ${rm.label}` : lockTitle}
                          className={`relative aspect-square rounded-xl overflow-hidden border transition-[transform,border-color,box-shadow,opacity] duration-200 ${
                            unlocked ? "cursor-pointer hover:-translate-y-0.5" : "cursor-not-allowed opacity-60"
                          } ${isLeg && unlocked ? "rarity-legendary-border" : ""}`}
                          style={{
                            borderColor: isActive ? rm.color : unlocked ? `${rm.color}55` : `${rm.color}22`,
                            boxShadow: isActive
                              ? `0 0 14px ${rm.glow}`
                              : isLeg && unlocked
                                ? `0 0 10px ${rm.glow}`
                                : undefined,
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={a.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                            style={{ filter: unlocked ? undefined : "grayscale(0.6)" }}
                          />
                          {a.kind === "animated" && (
                            <span className="absolute bottom-0.5 left-0.5 text-[7px] font-extrabold px-1 py-px rounded bg-black/70 text-white leading-none tracking-wider">
                              GIF
                            </span>
                          )}
                          {isApplying && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <Loader2 size={16} className="text-white animate-spin" />
                            </div>
                          )}
                          {isActive && !isApplying && (
                            <span
                              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-[var(--surface)]"
                              style={{ background: rm.color }}
                            >
                              <Check size={9} className="text-white" />
                            </span>
                          )}
                          {!unlocked && (
                            <span className="absolute top-0.5 right-0.5 flex items-center gap-0.5 bg-black/80 border border-white/10 rounded-full px-1 py-0.5">
                              {a.premium ? <Crown size={8} className="text-yellow-400" /> : <Lock size={8} className="text-yellow-400" />}
                              <span className="text-[8px] font-bold text-yellow-400 tabular-nums">{a.unlockLevel}</span>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-[var(--text3)] text-center mt-2">
            {reducedMotion
              ? "Анимация отключена — GIF показаны стоп-кадром"
              : `${AVATAR_CATALOG.length} аватарок · ${STATIC_AVATARS.length} статичных + ${ANIMATED_AVATARS.length} GIF`}
          </p>
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
