import { useEffect } from 'react'
import { ACH_CATEGORIES, getAchievementShowcase, ACHIEVEMENTS } from '../game/achievements'

interface Props {
  onClose: () => void
}

/**
 * Başarımlar ekranı — kategorilere ayrılmış, kazanılan/kilitli/ilerlemeli rozet vitrini.
 */
export default function Achievements({ onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const items = getAchievementShowcase()
  const earned = items.filter((i) => i.earned).length

  // Kategoriye göre grupla
  const grouped = ACH_CATEGORIES.map((cat) => ({
    ...cat,
    items: items.filter((i) => i.ach.cat === cat.id),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 sm:items-center"
      style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="anim-pop my-auto w-full max-w-2xl rounded-2xl border p-5 shadow-2xl"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Başarımlar">

        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold" style={{ color: 'var(--gold-bright)' }}>
            🏆 Başarımlar
          </h2>
          <button onClick={onClose} className="card-btn rounded-xl border px-3 py-1 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            Kapat
          </button>
        </div>

        {/* Özet çubuğu */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full transition-all" style={{
                width: `${Math.round((earned / ACHIEVEMENTS.length) * 100)}%`,
                background: 'var(--gold)',
              }} />
            </div>
          </div>
          <span className="shrink-0 text-sm font-bold" style={{ color: 'var(--gold)' }}>
            {earned} / {ACHIEVEMENTS.length}
          </span>
        </div>

        {/* Kategorili rozet listesi */}
        <div className="mt-4 flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
          {grouped.map((group) => {
            const groupEarned = group.items.filter((i) => i.earned).length
            return (
              <div key={group.id}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-sm">{group.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
                    {group.label}
                  </span>
                  <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-dim)' }}>
                    {groupEarned}/{group.items.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {group.items.map(({ ach, earned, date, progress }) => (
                    <div key={ach.id}
                      className={`flex items-start gap-2.5 rounded-xl border p-2.5 transition-opacity ${earned ? '' : 'opacity-40'}`}
                      style={{
                        borderColor: earned ? 'var(--gold)' : 'var(--border)',
                        background: earned ? 'var(--bg-input)' : 'transparent',
                      }}>
                      <span className="text-xl leading-none">{ach.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold" style={{ color: earned ? 'var(--gold-bright)' : 'var(--text-dim)' }}>
                          {ach.name}
                        </div>
                        <div className="text-xs leading-snug" style={{ color: 'var(--text-dim)' }}>
                          {ach.desc}
                        </div>
                        {earned && date && (
                          <div className="mt-0.5 text-[10px]" style={{ color: 'var(--text-dim)' }}>
                            🏅 {date}
                          </div>
                        )}
                        {!earned && progress && (
                          <div className="mt-1">
                            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
                              <div className="h-full rounded-full transition-all" style={{
                                width: `${Math.round((progress.current / progress.target) * 100)}%`,
                                background: 'var(--gold)',
                              }} />
                            </div>
                            <div className="mt-0.5 text-[10px] tabular-nums" style={{ color: 'var(--text-dim)' }}>
                              {progress.current} / {progress.target}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
          Rozetler otomatik kazanılır — oynadıkça yenileri açılır.
        </p>
      </div>
    </div>
  )
}
