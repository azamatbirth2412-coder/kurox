'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trash2, X, Play } from 'lucide-react'

interface HistoryItem {
  id: string
  title: string
  poster: string | null
  slug: string | null
  episodeNum: number
}

export function WatchHistorySection({ initial }: { initial: HistoryItem[] }) {
  const [items, setItems] = useState(initial)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function deleteOne(id: string) {
    setDeleting(id)
    await fetch('/api/watch-history', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setItems(prev => prev.filter(i => i.id !== id))
    setDeleting(null)
  }

  async function clearAll() {
    setClearing(true)
    await fetch('/api/watch-history', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setItems([])
    setClearing(false)
    setConfirm(false)
  }

  if (items.length === 0) return (
    <p className="text-gray-400 text-sm">
      История пуста.{' '}
      <Link href="/anime" className="text-purple-400 hover:underline">Начните смотреть!</Link>
    </p>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400">{items.length} записей</span>
        {!confirm ? (
          <button
            onClick={() => setConfirm(true)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            <Trash2 size={13} /> Очистить всё
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Точно удалить всё?</span>
            <button
              onClick={clearAll}
              disabled={clearing}
              className="text-xs px-3 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              {clearing ? '...' : 'Да, удалить'}
            </button>
            <button onClick={() => setConfirm(false)} className="text-gray-500 hover:text-gray-300">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Netflix-style horizontal "continue watching" row */}
      <div className="h-scroll -mx-1 px-1">
        {items.map(h => (
          <div key={h.id} className="relative group w-32 sm:w-36 flex-shrink-0">
            <Link href={h.slug ? `/anime/${h.slug}` : '/anime'} className="block">
              <div className="aspect-[2/3] relative rounded-xl overflow-hidden bg-[var(--surface2)] ring-1 ring-white/5">
                {h.poster ? (
                  <Image src={h.poster} alt={h.title} fill sizes="144px" className="object-cover group-hover:scale-[1.05] transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full bg-[var(--surface3)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

                {/* Play affordance on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="w-11 h-11 rounded-full bg-[var(--profile-accent,var(--accent))]/90 backdrop-blur-md flex items-center justify-center shadow-lg">
                    <Play size={18} className="text-white fill-white ml-0.5" />
                  </span>
                </div>

                {/* Episode chip */}
                <span className="absolute bottom-1.5 left-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white">
                  Серия {h.episodeNum}
                </span>
              </div>
              <div className="pt-1.5 px-0.5">
                <div className="text-xs font-semibold line-clamp-1 text-[var(--text)]">{h.title || 'Аниме'}</div>
              </div>
            </Link>

            {/* Delete button */}
            <button
              onClick={() => deleteOne(h.id)}
              disabled={deleting === h.id}
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 text-gray-300 hover:text-red-400 hover:bg-black/90 transition-[color,background-color,opacity] flex items-center justify-center opacity-0 group-hover:opacity-100 disabled:opacity-50"
              title="Удалить из истории"
            >
              {deleting === h.id ? (
                <span className="text-[10px]">...</span>
              ) : (
                <X size={13} />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
