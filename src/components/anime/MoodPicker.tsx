'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { Zap, Wind, Smile, CloudRain, Eye, Trophy } from 'lucide-react'

const MOODS = [
  {
    id: 'hype',
    label: 'Хайп',
    desc: 'Экшен и адреналин',
    Icon: Zap,
    bg: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #991b1b 100%)',
    accent: '#ef4444',
    glow: 'rgba(239,68,68,0.25)',
  },
  {
    id: 'chill',
    label: 'Расслабиться',
    desc: 'Уютно и спокойно',
    Icon: Wind,
    bg: 'linear-gradient(135deg, #0c1445 0%, #1e3a5f 50%, #1d4ed8 100%)',
    accent: '#60a5fa',
    glow: 'rgba(96,165,250,0.2)',
  },
  {
    id: 'laugh',
    label: 'Посмеяться',
    desc: 'Комедия и угар',
    Icon: Smile,
    bg: 'linear-gradient(135deg, #1a2e05 0%, #365314 50%, #4d7c0f 100%)',
    accent: '#86efac',
    glow: 'rgba(134,239,172,0.2)',
  },
  {
    id: 'sad',
    label: 'Погрустить',
    desc: 'Драма и чувства',
    Icon: CloudRain,
    bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
    accent: '#a5b4fc',
    glow: 'rgba(165,180,252,0.2)',
  },
  {
    id: 'tense',
    label: 'Напряжение',
    desc: 'Триллер и детектив',
    Icon: Eye,
    bg: 'linear-gradient(135deg, #0a0a0a 0%, #1c1917 50%, #292524 100%)',
    accent: '#d97706',
    glow: 'rgba(217,119,6,0.25)',
  },
  {
    id: 'inspire',
    label: 'Вдохновение',
    desc: 'Спорт и преодоление',
    Icon: Trophy,
    bg: 'linear-gradient(135deg, #042f2e 0%, #134e4a 50%, #0d9488 100%)',
    accent: '#5eead4',
    glow: 'rgba(94,234,212,0.2)',
  },
] as const

type MoodId = typeof MOODS[number]['id']

interface AnimeResult {
  id: string
  slug: string
  title: string
  poster: string | null
  year: number | null
  type: string
  genres: string
}

export function MoodPicker() {
  const [active, setActive] = useState<MoodId | null>(null)
  const [results, setResults] = useState<AnimeResult[]>([])
  const [loading, setLoading] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)
  const cache = useRef<Partial<Record<MoodId, AnimeResult[]>>>({})

  async function pick(id: MoodId) {
    if (active === id) { setActive(null); setResults([]); return }
    setActive(id)
    if (cache.current[id]) {
      setResults(cache.current[id]!)
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
      return
    }
    setLoading(true)
    setResults([])
    const res = await fetch(`/api/mood?mood=${id}`)
    const data: AnimeResult[] = await res.json()
    cache.current[id] = data
    setResults(data)
    setLoading(false)
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
  }

  const activeMood = MOODS.find(m => m.id === active)

  function parseGenres(raw: string): string[] {
    try { return JSON.parse(raw).slice(0, 2) } catch { return [] }
  }

  return (
    <div>
      {/* Mood cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {MOODS.map(m => {
          const isActive = active === m.id
          return (
            <button
              key={m.id}
              onClick={() => pick(m.id)}
              className="relative overflow-hidden rounded-2xl text-left transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: m.bg,
                boxShadow: isActive ? `0 0 0 2px ${m.accent}, 0 8px 32px ${m.glow}` : `0 2px 12px rgba(0,0,0,0.4)`,
                transform: isActive ? 'scale(0.97)' : undefined,
              }}
            >
              {/* Subtle top-right glow circle */}
              <div
                className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-xl opacity-40 pointer-events-none"
                style={{ background: m.accent }}
              />

              <div className="relative z-10 p-4">
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${m.accent}22`, border: `1px solid ${m.accent}44` }}
                >
                  <m.Icon size={18} style={{ color: m.accent }} strokeWidth={2} />
                </div>

                {/* Text */}
                <div className="text-[13px] font-semibold text-white leading-tight">{m.label}</div>
                <div className="text-[11px] mt-0.5 leading-tight" style={{ color: `${m.accent}cc` }}>
                  {m.desc}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Results */}
      <div ref={resultsRef}>
        {loading && (
          <div className="mt-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-gray-800/60 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && results.length > 0 && activeMood && (
          <div className="mt-6">
            <p className="text-sm text-gray-400 mb-4 flex items-center gap-2">
              <activeMood.Icon size={14} style={{ color: activeMood.accent }} />
              <span className="font-medium" style={{ color: activeMood.accent }}>{activeMood.label}</span>
              <span className="text-gray-500">—</span>
              <span>{results.length} аниме</span>
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
              {results.map(a => (
                <Link key={a.id} href={`/anime/${a.slug}`} className="group block">
                  <div className="aspect-[2/3] relative rounded-xl overflow-hidden bg-gray-800">
                    {a.poster ? (
                      <img
                        src={a.poster}
                        alt={a.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="mt-2 px-0.5">
                    <div className="text-xs font-medium text-white line-clamp-2 leading-tight">{a.title}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {parseGenres(a.genres).join(' · ') || a.type}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!loading && active && results.length === 0 && (
          <p className="mt-6 text-sm text-gray-500 text-center py-8">
            Ничего не нашлось — каталог ещё заполняется
          </p>
        )}
      </div>
    </div>
  )
}
