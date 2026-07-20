import { useEffect, useState } from 'react'
import { passiveUrl, spellUrl, splashUrl } from '../game/data'
import type { Champion } from '../game/types'

interface InfoEntry {
  lore: string
  passive: { name: string; desc: string }
  spells: { slot: string; name: string; desc: string }[]
}

type InfoMap = Record<string, InfoEntry>

/**
 * Lore + yetenek açıklamaları ANA pakette değil (~272 KB) — kart ilk açıldığında
 * dinamik import ile iner, sonrası tarayıcı önbelleğinden gelir.
 * Modül düzeyinde saklanır ki her açılışta tekrar çözülmesin.
 */
let cache: InfoMap | null = null

async function loadInfo(): Promise<InfoMap> {
  cache ??= (await import('../data/champion-info.json')).default as InfoMap
  return cache
}

interface Props {
  champion: Champion
  /** Kostüm/Görsel modunda tur sonunda gösterilen görselle tutarlı olsun */
  splashNum?: number
  onClose: () => void
}

export default function ChampionInfo({ champion, splashNum = 0, onClose }: Props) {
  const [info, setInfo] = useState<InfoEntry | null>(cache?.[champion.id] ?? null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let alive = true
    loadInfo()
      .then((m) => { if (alive) setInfo(m[champion.id] ?? null) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [champion.id])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 sm:items-center"
      style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="anim-pop my-auto w-full max-w-2xl rounded-2xl border shadow-2xl"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
        aria-label={`${champion.name} bilgi kartı`}>

        {/* Görsel + ad başlık */}
        <div className="relative">
          <img src={splashUrl(champion.id, splashNum)} alt={champion.name}
            className="aspect-video w-full rounded-t-2xl object-cover" />
          <div className="absolute inset-x-0 bottom-0 rounded-b-none p-4"
            style={{ background: 'linear-gradient(to top, var(--bg-card), transparent)' }}>
            <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--gold-bright)' }}>
              {champion.name}
            </h2>
            <p className="text-sm" style={{ color: 'var(--gold)' }}>{champion.title}</p>
          </div>
          <button onClick={onClose} aria-label="Kapat"
            className="card-btn absolute right-3 top-3 rounded-xl border px-3 py-1 text-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-dim)' }}>
            Kapat
          </button>
        </div>

        <div className="p-5">
          {/* Künye — Klasik modun kolonlarıyla aynı bilgiler */}
          <div className="flex flex-wrap gap-1.5">
            {[champion.region, ...champion.roles, ...champion.lanes, champion.resource, champion.rangeType,
              champion.year ? String(champion.year) : null].filter(Boolean).map((t, i) => (
              <span key={`${t}-${i}`} className="rounded-md px-2 py-0.5 text-xs font-semibold"
                style={{ background: 'var(--bg-input)', color: 'var(--text)' }}>{t}</span>
            ))}
          </div>

          {failed && (
            <p className="mt-4 text-sm" style={{ color: 'var(--danger-text)' }}>
              Bilgi verisi yüklenemedi (çevrimdışı olabilirsin).
            </p>
          )}

          {!info && !failed && (
            <p className="mt-4 text-sm" style={{ color: 'var(--text-dim)' }}>Yükleniyor...</p>
          )}

          {info && (
            <>
              {info.lore && (
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                  {info.lore}
                </p>
              )}

              <h3 className="mt-5 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
                Yetenekler
              </h3>
              <div className="mt-2 flex flex-col gap-3">
                <div className="flex gap-3">
                  <img src={passiveUrl(champion.passive.img)} alt="" className="h-11 w-11 shrink-0 rounded-lg border"
                    style={{ borderColor: 'var(--border)' }} />
                  <div className="min-w-0">
                    <div className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
                      Pasif · {info.passive.name}
                    </div>
                    <p className="whitespace-pre-line text-sm" style={{ color: 'var(--text)' }}>{info.passive.desc}</p>
                  </div>
                </div>
                {champion.spells.map((s, i) => (
                  <div key={s.slot} className="flex gap-3">
                    <img src={spellUrl(s.img)} alt="" className="h-11 w-11 shrink-0 rounded-lg border"
                      style={{ borderColor: 'var(--border)' }} />
                    <div className="min-w-0">
                      <div className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
                        {s.slot} · {s.name}
                      </div>
                      <p className="whitespace-pre-line text-sm" style={{ color: 'var(--text)' }}>
                        {info.spells[i]?.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
