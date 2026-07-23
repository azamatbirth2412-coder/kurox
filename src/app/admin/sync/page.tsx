"use client";
import { useState, useRef, useCallback } from "react";
import { RefreshCw, Download, CheckCircle, XCircle, Loader2, Film, Database } from "lucide-react";

interface ProgressEvent {
  message: string;
  page?: number;
  maxPages?: number;
  added?: number;
  updated?: number;
  errors?: number;
}

interface DoneEvent {
  added: number;
  updated: number;
  errors: number;
  newTitles: string[];
}

type SyncMode = "new" | "all";

export default function SyncPage() {
  const [syncing, setSyncing]     = useState(false);
  const [mode, setMode]           = useState<SyncMode | null>(null);
  const [progress, setProgress]   = useState<ProgressEvent | null>(null);
  const [result, setResult]       = useState<DoneEvent | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const esRef                     = useRef<EventSource | null>(null);

  const startSync = useCallback((m: SyncMode) => {
    if (syncing) return;
    setSyncing(true);
    setMode(m);
    setProgress({ message: "Подключаемся…" });
    setResult(null);
    setError(null);

    const es = new EventSource(`/api/admin/sync?mode=${m}`);
    esRef.current = es;

    es.addEventListener("progress", (e: MessageEvent) => {
      setProgress(JSON.parse(e.data));
    });

    es.addEventListener("done", (e: MessageEvent) => {
      setResult(JSON.parse(e.data));
      setProgress(null);
      setSyncing(false);
      es.close();
    });

    es.addEventListener("failure", (e: MessageEvent) => {
      setError(JSON.parse(e.data).message ?? "Неизвестная ошибка");
      setSyncing(false);
      es.close();
    });

    es.onerror = () => {
      if (!result) setError("Соединение прервано. Попробуйте снова.");
      setSyncing(false);
      es.close();
    };
  }, [syncing, result]);

  const pct = progress?.page && progress?.maxPages
    ? Math.round((progress.page / progress.maxPages) * 100)
    : null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Database size={28} className="text-violet-400" />
          Синхронизация аниме
        </h1>
        <p className="text-[var(--text2)] text-sm mt-1">
          Загрузить тайтлы из Anilibria в локальную базу данных
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Новые */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <RefreshCw size={18} className="text-green-400" />
            </div>
            <div>
              <h2 className="font-bold">Новые релизы</h2>
              <p className="text-xs text-[var(--text3)]">Последние 100 добавленных тайтлов</p>
            </div>
          </div>
          <p className="text-sm text-[var(--text2)] flex-1 mb-5">
            Быстрая проверка — загружает 2 страницы по 50 аниме, отсортированных по дате добавления. Занимает ~5 секунд.
          </p>
          <button
            onClick={() => startSync("new")}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 text-green-400 font-semibold py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {syncing && mode === "new"
              ? <Loader2 size={16} className="animate-spin" />
              : <RefreshCw size={16} />
            }
            Синхронизировать новые
          </button>
        </div>

        {/* Полная */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <Download size={18} className="text-violet-400" />
            </div>
            <div>
              <h2 className="font-bold">Полная синхронизация</h2>
              <p className="text-xs text-[var(--text3)]">До 2 000 тайтлов по рейтингу</p>
            </div>
          </div>
          <p className="text-sm text-[var(--text2)] flex-1 mb-5">
            Загружает 40 страниц по 50 тайтлов. Обновляет существующие записи и добавляет новые. Занимает ~2 минуты.
          </p>
          <button
            onClick={() => startSync("all")}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/40 text-violet-400 font-semibold py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {syncing && mode === "all"
              ? <Loader2 size={16} className="animate-spin" />
              : <Download size={16} />
            }
            Полная синхронизация
          </button>
        </div>
      </div>

      {/* Прогресс */}
      {syncing && progress && (
        <div className="bg-[var(--surface)] border border-violet-500/30 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 size={18} className="text-violet-400 animate-spin flex-shrink-0" />
            <span className="font-semibold text-sm">{progress.message}</span>
          </div>

          {pct !== null && (
            <>
              <div className="w-full bg-[var(--surface2)] rounded-full h-2 mb-2">
                <div
                  className="bg-violet-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-[var(--text3)]">
                <span>Страница {progress.page} / {progress.maxPages}</span>
                <span>{pct}%</span>
              </div>
            </>
          )}

          {(progress.added !== undefined) && (
            <div className="flex gap-4 mt-3 text-xs">
              <span className="text-green-400">+{progress.added} добавлено</span>
              <span className="text-blue-400">↻ {progress.updated} обновлено</span>
              {(progress.errors ?? 0) > 0 && <span className="text-red-400">✕ {progress.errors} ошибок</span>}
            </div>
          )}
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
          <XCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Результат */}
      {result && (
        <div className="bg-[var(--surface)] border border-green-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <CheckCircle size={20} className="text-green-400" />
            <h2 className="font-bold text-lg">Синхронизация завершена</h2>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-green-400">{result.added}</div>
              <div className="text-xs text-[var(--text3)] mt-1">Добавлено</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-blue-400">{result.updated}</div>
              <div className="text-xs text-[var(--text3)] mt-1">Обновлено</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-red-400">{result.errors}</div>
              <div className="text-xs text-[var(--text3)] mt-1">Ошибок</div>
            </div>
          </div>

          {result.newTitles.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text2)] mb-3 flex items-center gap-2">
                <Film size={14} className="text-violet-400" />
                Новые тайтлы ({result.newTitles.length}{result.newTitles.length === 50 ? "+" : ""})
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.newTitles.map((t, i) => (
                  <span key={i} className="text-xs bg-[var(--surface2)] border border-[var(--border)] px-2.5 py-1 rounded-lg">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--text2)]">Новых тайтлов не обнаружено — база данных актуальна.</p>
          )}
        </div>
      )}
    </div>
  );
}
