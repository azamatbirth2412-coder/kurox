"use client";
import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Camera, Trash2, Loader2 } from "lucide-react";

interface Props {
  name: string;
  currentImage: string | null;
}

export function AvatarUpload({ name, currentImage }: Props) {
  const { update } = useSession();
  const [image, setImage] = useState<string | null>(currentImage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const initial = (name?.[0] || "?").toUpperCase();

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
        // Crop to square from center
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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Только изображения");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const base64 = await resizeToBase64(file);
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Ошибка загрузки");
      }
      setImage(base64);
      await update({});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/user/avatar", { method: "DELETE" });
      setImage(null);
      await update({});
    } catch {
      setError("Ошибка удаления");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar circle */}
      <div className="relative group">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-3xl font-bold ring-4 ring-[var(--border)]">
          {image ? (
            <Image src={image} alt="Аватар" width={96} height={96} className="object-cover w-full h-full" />
          ) : (
            <span>{initial}</span>
          )}
        </div>

        {/* Camera overlay */}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          {loading ? (
            <Loader2 size={22} className="text-white animate-spin" />
          ) : (
            <Camera size={22} className="text-white" />
          )}
        </button>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 rounded-lg transition-colors"
        >
          <Camera size={12} />
          {image ? "Изменить" : "Загрузить фото"}
        </button>
        {image && (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
          >
            <Trash2 size={12} />
            Удалить
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
