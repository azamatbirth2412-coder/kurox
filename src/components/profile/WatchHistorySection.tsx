'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trash2, X } from 'lucide-react'

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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map(h => (
          <div key={h.id} className="relative group bg-gray-900 rounded-xl overflow-hidden">
            <Link href={h.slug ? `/anime/${h.slug}` : '/anime'}>
              <div className="aspect-[2/3] relative">
                {h.poster ? (
                  <Image src={h.poster} alt={h.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full bg-gray-700" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-2 text-xs">
                <div className="font-medium line-clamp-1">{h.title || 'Аниме'}</div>
                <div className="text-gray-400">Серия {h.episodeNum}</div>
              </div>
            </Link>

            {/* Delete button */}
            <button
              onClick={() => deleteOne(h.id)}
              disabled={deleting === h.id}
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 text-gray-400 hover:text-red-400 hover:bg-black/90 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 disabled:opacity-50"
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
