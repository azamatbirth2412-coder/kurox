"use client";
import { useState, useRef, useEffect } from "react";
import {
  Save, Eye, EyeOff, Image, Code, ExternalLink, CheckCircle,
  Megaphone, Plus, Trash2, Video, Upload, Loader2, AlertTriangle, Info,
} from "lucide-react";

const SLOTS = [
  {
    id: "in-player",
    name: "Под плеером",
    desc: "Показывается под видеоплеером на странице аниме",
    recommendedSizes: ["728×90", "970×90", "1200×130"],
    primarySize: "728×90",
    minAspect: 4,   // ширина / высота >= 4
    icon: "🎬",
  },
  {
    id: "sidebar",
    name: "Сайдбар",
    desc: "Боковая панель на странице аниме (десктоп)",
    recommendedSizes: ["300×250", "300×600"],
    primarySize: "300×250",
    minAspect: 0.3,
    maxAspect: 1.5,
    icon: "📐",
  },
  {
    id: "between-cards",
    name: "Между секциями",
    desc: "Между блоками аниме на главной странице",
    recommendedSizes: ["728×90", "970×90"],
    primarySize: "728×90",
    minAspect: 4,
    icon: "📋",
  },
  {
    id: "header",
    name: "Верхний баннер",
    desc: "В шапке сайта над каталогом",
    recommendedSizes: ["728×90", "970×90"],
    primarySize: "728×90",
    minAspect: 4,
    icon: "🔝",
  },
];

type AdType = "image" | "script" | "html" | "video";

interface AdSlotData {
  id: string;
  slot: string;
  code: string;
  isActive: boolean;
}

interface BannerItem {
  url: string;
  link: string;
}

interface SlotState {
  id: string;
  slot: string;
  code: string;
  isActive: boolean;
  adType: AdType;
  banners: BannerItem[];
  scriptCode: string;
  videoUrl: string;
  videoLink: string;
}

// ── Image dimension hook ──────────────────────────────────────────────────────
function useImageDimensions(url: string) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  useEffect(() => {
    if (!url.trim()) { setDims(null); setStatus("idle"); return; }
    setStatus("loading");
    const img = new window.Image();
    img.onload = () => { setDims({ w: img.naturalWidth, h: img.naturalHeight }); setStatus("ok"); };
    img.onerror = () => { setDims(null); setStatus("error"); };
    img.src = url;
  }, [url]);

  return { dims, status };
}

interface DimCheckProps {
  url: string;
  slotMeta: typeof SLOTS[number];
}

function DimCheck({ url, slotMeta }: DimCheckProps) {
  const { dims, status } = useImageDimensions(url);

  if (!url) return null;
  if (status === "loading") return (
    <div className="flex items-center gap-2 text-xs text-[var(--text3)] mt-1">
      <Loader2 size={12} className="animate-spin" /> Проверяем размер…
    </div>
  );
  if (status === "error") return (
    <div className="flex items-center gap-2 text-xs text-red-400 mt-1">
      <AlertTriangle size={12} /> Не удалось загрузить картинку — проверь ссылку
    </div>
  );
  if (!dims) return null;

  const ratio = dims.w / dims.h;
  const tooTall = slotMeta.minAspect !== undefined && ratio < slotMeta.minAspect;
  const tooWide = slotMeta.maxAspect !== undefined && ratio > slotMeta.maxAspect;
  const bad = tooTall || tooWide;

  if (bad) {
    return (
      <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
          <AlertTriangle size={13} />
          Неподходящий размер: {dims.w}×{dims.h}
        </div>
        <p className="text-xs text-amber-300/80">
          Для этого места нужен горизонтальный баннер.
        </p>
        <p className="text-xs text-amber-300/80">
          Нужный размер: <strong className="text-amber-300">{slotMeta.recommendedSizes.join(" или ")}</strong>
        </p>
        <p className="text-xs text-amber-300/60">
          Ищи баннер с пропорцией намного шире чем высота (например 728 пикс. шириной и всего 90 пикс. высотой).
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-emerald-400 mt-1">
      <CheckCircle size={12} /> {dims.w}×{dims.h} — размер подходит
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function buildCode(state: SlotState): string {
  if (state.adType === "video") {
    if (!state.videoUrl.trim()) return "";
    return `<!-- VIDEO -->${JSON.stringify({ videoUrl: state.videoUrl.trim(), videoLink: state.videoLink.trim() })}`;
  }
  if (state.adType === "image") {
    const active = state.banners.filter(b => b.url.trim());
    if (!active.length) return "";
    if (active.length === 1) {
      const b = active[0];
      return `<a href="${b.link || "#"}" target="_blank" rel="noopener noreferrer" style="display:block;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.35);transition:transform 0.2s,box-shadow 0.2s" onmouseover="this.style.transform='scale(1.01)';this.style.boxShadow='0 8px 32px rgba(0,0,0,0.5)'" onmouseout="this.style.transform='';this.style.boxShadow='0 4px 20px rgba(0,0,0,0.35)'"><img src="${b.url}" alt="Реклама" style="width:100%;height:auto;display:block" /></a>`;
    }
    return `<!-- ROTATING -->${JSON.stringify(active)}`;
  }
  if (state.adType === "script") return state.scriptCode;
  return state.code;
}

function parseSlotState(s: AdSlotData): SlotState {
  if (s.code.startsWith("<!-- VIDEO -->")) {
    try {
      const { videoUrl, videoLink } = JSON.parse(s.code.replace("<!-- VIDEO -->", "").trim());
      return { ...s, adType: "video", banners: [{ url: "", link: "" }], scriptCode: "", videoUrl: videoUrl || "", videoLink: videoLink || "" };
    } catch {/* fall through */}
  }
  if (s.code.startsWith("<!-- ROTATING -->")) {
    try {
      const banners: BannerItem[] = JSON.parse(s.code.replace("<!-- ROTATING -->", "").trim());
      return { ...s, adType: "image", banners, scriptCode: "", videoUrl: "", videoLink: "" };
    } catch {/* fall through */}
  }
  const imgMatch  = s.code.match(/src="([^"]+)"/);
  const hrefMatch = s.code.match(/href="([^"]+)"/);
  const isImage   = s.code.includes("<img") && imgMatch;
  return {
    ...s,
    adType: isImage ? "image" : s.code.includes("<script") ? "script" : "html",
    banners: isImage
      ? [{ url: imgMatch?.[1] || "", link: hrefMatch?.[1] || "" }]
      : [{ url: "", link: "" }],
    scriptCode: s.code.includes("<script") ? s.code : "",
    videoUrl: "", videoLink: "",
  };
}

const AD_TEMPLATES = [
  { label: "Яндекс Директ",  code: `<!-- Яндекс.Директ -->\n<script async src="//an.yandex.ru/system/context.js"></script>\n<ins class="yandex_rtb" data-block-id="ВАШ_ID"></ins>` },
  { label: "Google AdSense", code: `<!-- Google AdSense -->\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX" crossorigin="anonymous"></script>\n<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXXXXXXXX" data-ad-slot="XXXXXXXXXX" data-ad-format="auto" data-full-width-responsive="true"></ins>\n<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>` },
];

export function AdManagement({ initialSlots }: { initialSlots: AdSlotData[] }) {
  const [slots, setSlots] = useState<Record<string, SlotState>>(
    Object.fromEntries(
      SLOTS.map(s => {
        const found = initialSlots.find(x => x.slot === s.id);
        return [s.id, parseSlotState(found || { id: "", slot: s.id, code: "", isActive: true })];
      })
    )
  );
  const [saving,      setSaving]      = useState<string | null>(null);
  const [saved,       setSaved]       = useState<string | null>(null);
  const [preview,     setPreview]     = useState<string | null>(null);
  const [uploading,   setUploading]   = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function uploadFile(slotId: string, file: File, target: "banner" | "video", bannerIdx?: number) {
    setUploading(slotId);
    const form = new FormData();
    form.append("file", file);
    try {
      const res  = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json();
      if (data.url) {
        if (target === "video") update(slotId, { videoUrl: data.url });
        else if (target === "banner" && bannerIdx !== undefined) updateBanner(slotId, bannerIdx, { url: data.url });
      }
    } finally { setUploading(null); }
  }

  function update(slotId: string, patch: Partial<SlotState>) {
    setSlots(p => ({ ...p, [slotId]: { ...p[slotId], ...patch } }));
  }

  function updateBanner(slotId: string, idx: number, patch: Partial<BannerItem>) {
    setSlots(p => {
      const banners = [...p[slotId].banners];
      banners[idx] = { ...banners[idx], ...patch };
      return { ...p, [slotId]: { ...p[slotId], banners } };
    });
  }

  function addBanner(slotId: string) {
    setSlots(p => ({ ...p, [slotId]: { ...p[slotId], banners: [...p[slotId].banners, { url: "", link: "" }] } }));
  }

  function removeBanner(slotId: string, idx: number) {
    setSlots(p => {
      const banners = p[slotId].banners.filter((_, i) => i !== idx);
      return { ...p, [slotId]: { ...p[slotId], banners: banners.length ? banners : [{ url: "", link: "" }] } };
    });
  }

  async function save(slotId: string, overrideSlot?: SlotState) {
    setSaving(slotId);
    const slot = overrideSlot ?? slots[slotId];
    const code = buildCode(slot);
    await fetch("/api/admin/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...slot, code }),
    });
    setSaving(null);
    setSaved(slotId);
    setTimeout(() => setSaved(null), 2500);
  }

  async function toggleActive(slotId: string) {
    const next = { ...slots[slotId], isActive: !slots[slotId].isActive };
    setSlots(p => ({ ...p, [slotId]: next }));
    await save(slotId, next);
  }

  async function clearSlot(slotId: string) {
    if (confirmClear !== slotId) { setConfirmClear(slotId); return; }
    setConfirmClear(null);
    const cleared: SlotState = {
      ...slots[slotId], code: "", isActive: false, adType: "image",
      banners: [{ url: "", link: "" }], scriptCode: "", videoUrl: "", videoLink: "",
    };
    setSlots(p => ({ ...p, [slotId]: cleared }));
    await save(slotId, cleared);
  }

  return (
    <div className="space-y-5">
      {/* Guide */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-3">
        <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-300/80 space-y-1">
          <p className="font-semibold text-blue-300">Как добавить рекламу:</p>
          <p>1. Выбери слот → Тип рекламы: <strong>Картинка</strong></p>
          <p>2. Вставь URL картинки или загрузи с компьютера</p>
          <p>3. Укажи ссылку при клике (например, t.me/KuroXanime)</p>
          <p>4. Нажми <strong>Сохранить</strong> и включи переключатель</p>
          <p className="text-amber-300/80">⚠ Если написано «неподходящий размер» — нужно найти баннер нужных пропорций</p>
        </div>
      </div>

      {SLOTS.map(slotMeta => {
        const slot      = slots[slotMeta.id];
        const isOpen    = preview === slotMeta.id;
        const previewCode = buildCode(slot);
        const hasContent  = !!previewCode;

        return (
          <div key={slotMeta.id}
            className={`bg-[var(--surface)] border rounded-2xl overflow-hidden transition-colors ${
              hasContent && slot.isActive
                ? "border-emerald-500/30"
                : "border-[var(--border)]"
            }`}>

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                  hasContent && slot.isActive ? "bg-emerald-500/15" : "bg-[var(--surface2)]"
                }`}>
                  {slotMeta.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{slotMeta.name}</h3>
                    {hasContent && slot.isActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 uppercase tracking-wide">
                        Активна
                      </span>
                    )}
                    {hasContent && !slot.isActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface2)] text-[var(--text3)] uppercase tracking-wide">
                        Отключена
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text3)] truncate">{slotMeta.desc}</p>
                </div>
              </div>

              {/* Toggle */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-[var(--text3)] hidden sm:block">
                  {slot.isActive ? "Вкл" : "Выкл"}
                </span>
                <div onClick={() => toggleActive(slotMeta.id)}
                  className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors flex-shrink-0 ${
                    slot.isActive ? "bg-violet-600" : "bg-[var(--surface2)]"
                  }`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    slot.isActive ? "translate-x-6" : "translate-x-1"
                  }`} />
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">

              {/* Recommended size badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[var(--text3)]">Рекомендуемый размер:</span>
                {slotMeta.recommendedSizes.map(sz => (
                  <span key={sz}
                    className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/20">
                    {sz}
                  </span>
                ))}
              </div>

              {/* Ad type tabs */}
              <div>
                <p className="text-xs font-semibold text-[var(--text3)] uppercase tracking-wide mb-2">Тип рекламы</p>
                <div className="flex gap-2 flex-wrap">
                  {([
                    { v: "image"  as AdType, label: "Картинка",              icon: Image  },
                    { v: "video"  as AdType, label: "Видео",                 icon: Video  },
                    { v: "script" as AdType, label: "Скрипт (Яндекс/Google)", icon: Code  },
                    { v: "html"   as AdType, label: "Свой HTML",              icon: Code  },
                  ]).map(({ v, label, icon: Icon }) => (
                    <button key={v} onClick={() => update(slotMeta.id, { adType: v })}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-[color,background-color,border-color] duration-150 ${
                        slot.adType === v
                          ? "bg-violet-600 border-violet-600 text-white"
                          : "bg-[var(--surface2)] border-[var(--border)] text-[var(--text2)] hover:text-white"
                      }`}>
                      <Icon size={13} /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── IMAGE ── */}
              {slot.adType === "image" && (
                <div className="space-y-3">
                  {slot.banners.length > 1 && (
                    <p className="text-xs text-violet-400 font-medium">
                      Баннеры меняются автоматически каждые 5 сек с плавным переходом
                    </p>
                  )}

                  {slot.banners.map((banner, idx) => (
                    <div key={idx} className="border border-[var(--border)] rounded-xl p-4 space-y-3 bg-[var(--surface2)]/40">
                      {slot.banners.length > 1 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--text3)]">Баннер {idx + 1}</span>
                          <button onClick={() => removeBanner(slotMeta.id, idx)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}

                      {/* Image URL */}
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text2)] mb-1.5">
                          URL картинки <span className="text-[var(--text3)] font-normal">(или загрузи с компа)</span>
                        </label>
                        <div className="flex gap-2">
                          <input type="url" value={banner.url}
                            onChange={e => updateBanner(slotMeta.id, idx, { url: e.target.value })}
                            placeholder="https://example.com/banner.jpg  или  /tg-banner.png"
                            className="flex-1 bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors placeholder:text-[var(--text3)]" />
                          <input type="file" accept="image/*"
                            ref={el => { fileRefs.current[`img-${slotMeta.id}-${idx}`] = el; }}
                            className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(slotMeta.id, f, "banner", idx); }} />
                          <button onClick={() => fileRefs.current[`img-${slotMeta.id}-${idx}`]?.click()}
                            disabled={uploading === slotMeta.id}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm border border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-[background-color,opacity] duration-150 disabled:opacity-50 whitespace-nowrap">
                            {uploading === slotMeta.id ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                            С компа
                          </button>
                        </div>

                        {/* Dimension check */}
                        <DimCheck url={banner.url} slotMeta={slotMeta} />
                      </div>

                      {/* Link URL */}
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text2)] mb-1.5">
                          Ссылка при клике
                        </label>
                        <div className="relative">
                          <ExternalLink size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                          <input type="url" value={banner.link}
                            onChange={e => updateBanner(slotMeta.id, idx, { link: e.target.value })}
                            placeholder="https://t.me/KuroXanime"
                            className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors placeholder:text-[var(--text3)]" />
                        </div>
                      </div>

                      {/* Image preview */}
                      {banner.url && (
                        <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-black/30 p-3">
                          <p className="text-[10px] text-[var(--text3)] mb-2 uppercase tracking-wide font-semibold">
                            Превью (как будет выглядеть на сайте)
                          </p>
                          <div style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.35)" }}>
                            <img src={banner.url} alt="preview"
                              className="w-full h-auto block"
                              onError={e => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                                const p = (e.currentTarget as HTMLImageElement).parentElement;
                                if (p) p.innerHTML = '<p style="color:#f87171;padding:12px;font-size:12px">⚠ Картинка не загрузилась — проверь ссылку</p>';
                              }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {slot.banners.length < 5 && (
                    <button onClick={() => addBanner(slotMeta.id)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border border-dashed border-violet-500/30 text-violet-400 hover:border-violet-500 hover:bg-violet-500/5 transition-all w-full justify-center">
                      <Plus size={14} /> Добавить ещё баннер (авто-смена)
                    </button>
                  )}
                </div>
              )}

              {/* ── VIDEO ── */}
              {slot.adType === "video" && (
                <div className="space-y-3">
                  <p className="text-xs text-violet-400 font-medium">
                    Видео воспроизводится автоматически без звука. При клике открывается ссылка.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text2)] mb-1.5">URL видеофайла (.mp4, .webm)</label>
                    <div className="flex gap-2">
                      <input type="url" value={slot.videoUrl}
                        onChange={e => update(slotMeta.id, { videoUrl: e.target.value })}
                        placeholder="https://example.com/ad.mp4"
                        className="flex-1 bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
                      <input type="file" accept="video/mp4,video/webm"
                        ref={el => { fileRefs.current[`video-${slotMeta.id}`] = el; }}
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(slotMeta.id, f, "video"); }} />
                      <button onClick={() => fileRefs.current[`video-${slotMeta.id}`]?.click()}
                        disabled={uploading === slotMeta.id}
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm border border-violet-500/40 text-violet-400 hover:bg-violet-500/10 transition-all disabled:opacity-50 whitespace-nowrap">
                        {uploading === slotMeta.id ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        С компа
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text2)] mb-1.5">Ссылка при клике</label>
                    <div className="relative">
                      <ExternalLink size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                      <input type="url" value={slot.videoLink}
                        onChange={e => update(slotMeta.id, { videoLink: e.target.value })}
                        placeholder="https://t.me/KuroXanime"
                        className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
                    </div>
                  </div>
                  {slot.videoUrl && (
                    <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-black/30 p-3">
                      <p className="text-[10px] text-[var(--text3)] mb-2 uppercase tracking-wide font-semibold">Превью</p>
                      <video src={slot.videoUrl} muted autoPlay loop playsInline className="w-full rounded-xl object-contain max-h-40" />
                    </div>
                  )}
                </div>
              )}

              {/* ── SCRIPT ── */}
              {slot.adType === "script" && (
                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    {AD_TEMPLATES.map(t => (
                      <button key={t.label} onClick={() => update(slotMeta.id, { scriptCode: t.code })}
                        className="px-3 py-1.5 bg-[var(--surface2)] hover:bg-[var(--surface3)] border border-[var(--border)] rounded-lg text-xs font-medium transition-colors">
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <textarea value={slot.scriptCode}
                    onChange={e => update(slotMeta.id, { scriptCode: e.target.value })}
                    placeholder="Вставьте код от рекламной сети..."
                    rows={6}
                    className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-violet-500 resize-y text-[var(--text)]" />
                </div>
              )}

              {/* ── HTML ── */}
              {slot.adType === "html" && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--text2)] mb-1.5">HTML-код рекламы</label>
                  <textarea value={slot.code}
                    onChange={e => update(slotMeta.id, { code: e.target.value })}
                    placeholder="<a href='...'><img src='...' /></a>"
                    rows={6}
                    className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-violet-500 resize-y text-[var(--text)]" />
                </div>
              )}

              {/* ── Actions ── */}
              <div className="flex items-center gap-3 pt-1 flex-wrap border-t border-[var(--border)]">
                <button onClick={() => save(slotMeta.id)} disabled={saving === slotMeta.id}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors mt-3">
                  {saved === slotMeta.id
                    ? <><CheckCircle size={14} /> Сохранено!</>
                    : saving === slotMeta.id
                    ? <><Loader2 size={14} className="animate-spin" /> Сохраняем…</>
                    : <><Save size={14} /> Сохранить</>}
                </button>

                {confirmClear === slotMeta.id ? (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-red-400 font-medium">Удалить всё?</span>
                    <button onClick={() => clearSlot(slotMeta.id)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-red-600 text-white hover:bg-red-500 font-semibold transition-colors">
                      Да, удалить
                    </button>
                    <button onClick={() => setConfirmClear(null)}
                      className="px-3 py-1.5 rounded-lg text-xs border border-[var(--border)] text-[var(--text2)] hover:text-white transition-colors">
                      Отмена
                    </button>
                  </div>
                ) : (
                  <button onClick={() => clearSlot(slotMeta.id)} disabled={saving === slotMeta.id}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 disabled:opacity-40 transition-colors mt-3">
                    <Trash2 size={14} /> Очистить
                  </button>
                )}

                {previewCode && (
                  <button onClick={() => setPreview(isOpen ? null : slotMeta.id)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] text-[var(--text2)] hover:text-white hover:border-violet-500/50 transition-colors mt-3 ml-auto">
                    {isOpen ? <EyeOff size={14} /> : <Eye size={14} />}
                    {isOpen ? "Скрыть код" : "Посмотреть HTML"}
                  </button>
                )}
              </div>

              {/* HTML preview */}
              {isOpen && previewCode && (
                <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                  <p className="text-[10px] text-[var(--text3)] bg-[var(--surface2)] px-3 py-1.5 font-mono border-b border-[var(--border)] uppercase tracking-wide">
                    Сохранённый HTML-код
                  </p>
                  <pre className="text-xs font-mono text-[var(--text2)] p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                    {previewCode}
                  </pre>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
