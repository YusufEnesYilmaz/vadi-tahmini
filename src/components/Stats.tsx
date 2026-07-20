import { useEffect, useState } from 'react'
import { getBestScore, getDailyStreak, getStats, isStreakAlive } from '../game/stats'
import {
  DIFFICULTIES, SUB_MODES, TOP_MODES,
  type Difficulty, type TopMode,
} from '../game/types'

interface Props {
  initialDifficulty: Difficulty
  onClose: () => void
}

function pct(a: number, b: number): string {
  return b === 0 ? '—' : `%${Math.round((a / b) * 100)}`
}

/**
 * İstatistik penceresi. Veriler zaten `recordGame`/`recordScore` ile toplanıyordu
 * ama hiçbir yerde görünmüyordu — burası onları gösteriyor.
 * Üst mod sekmesi + (Günlük hariç) zorluk sekmesi ile 18 kombinasyon gezilebilir.
 */
export default function Stats({ initialDifficulty, onClose }: Props) {
  const [top, setTop] = useState<TopMode>('endless')
  const [diff, setDiff] = useState<Difficulty>(initialDifficulty)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const daily = top === 'daily'
  const timed = top === 'timed'
  const streak = getDailyStreak()

  const rows = SUB_MODES.map((m) => ({ mode: m, s: getStats(top, m.id, diff) }))
  const totalPlayed = rows.reduce((n, r) => n + r.s.played, 0)
  const totalWon = rows.reduce((n, r) => n + r.s.won, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 sm:items-center"
      style={{ background: 'rgba(4, 7, 15, 0.75)' }} onClick={onClose}>
      <div className="anim-pop my-auto w-full max-w-lg rounded-2xl border p-5 shadow-2xl"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="İstatistikler">

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold" style={{ color: 'var(--gold-bright)' }}>İstatistikler</h2>
          <button onClick={onClose} className="card-btn rounded-lg border px-3 py-1 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            Kapat
          </button>
        </div>

        {/* Üst mod sekmeleri */}
        <div className="mt-4 flex overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          {TOP_MODES.map((m) => (
            <button key={m.id} onClick={() => setTop(m.id)}
              className="flex-1 px-2 py-2 text-xs font-bold sm:text-sm"
              style={{
                background: top === m.id ? 'var(--gold)' : 'transparent',
                color: top === m.id ? '#0a0e1a' : 'var(--text-dim)',
              }}>
              {m.icon} {m.name}
            </button>
          ))}
        </div>

        {/* Zorluk sekmeleri — Günlük'te zorluk yok */}
        {!daily && (
          <div className="mt-2 flex overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            {DIFFICULTIES.map((d) => (
              <button key={d.id} onClick={() => setDiff(d.id)}
                className="flex-1 px-1 py-1.5 text-xs font-semibold"
                style={{
                  background: diff === d.id ? 'var(--bg-input)' : 'transparent',
                  color: diff === d.id ? 'var(--gold)' : 'var(--text-dim)',
                }}>
                {d.name}
              </button>
            ))}
          </div>
        )}

        {/* Özet */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border p-2" style={{ borderColor: 'var(--border)' }}>
            <div className="text-xl font-extrabold" style={{ color: 'var(--gold-bright)' }}>{totalPlayed}</div>
            <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>oynanan</div>
          </div>
          <div className="rounded-xl border p-2" style={{ borderColor: 'var(--border)' }}>
            <div className="text-xl font-extrabold" style={{ color: 'var(--gold-bright)' }}>{pct(totalWon, totalPlayed)}</div>
            <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>kazanma</div>
          </div>
          <div className="rounded-xl border p-2" style={{ borderColor: 'var(--border)' }}>
            <div className="text-xl font-extrabold" style={{ color: 'var(--gold-bright)' }}>
              {daily ? (isStreakAlive(streak) ? streak.streak : 0) : Math.max(...rows.map((r) => r.s.bestStreak), 0)}
            </div>
            <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
              {daily ? 'gün serisi' : 'en iyi seri'}
            </div>
          </div>
        </div>

        {/* Mod mod döküm */}
        <div className="mt-4 flex flex-col gap-1.5">
          {rows.map(({ mode, s }) => {
            const avg = s.won > 0 ? (s.totalGuesses / s.won).toFixed(1) : '—'
            return (
              <div key={mode.id} className="flex items-center gap-3 rounded-lg border px-3 py-2"
                style={{ borderColor: 'var(--border)' }}>
                <span className="text-lg">{mode.icon}</span>
                <span className="flex-1 text-sm font-semibold">{mode.name}</span>
                {s.played === 0 ? (
                  <span className="text-xs" style={{ color: 'var(--text-dim)' }}>henüz oynanmadı</span>
                ) : timed ? (
                  <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                    {s.played} tur · en iyi <b style={{ color: 'var(--gold)' }}>{getBestScore(mode.id, diff)}</b>
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                    {s.played} oyun · {pct(s.won, s.played)} · ort. <b style={{ color: 'var(--gold)' }}>{avg}</b> tahmin
                    {s.bestStreak > 0 && <> · seri {s.currentStreak}/{s.bestStreak}</>}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
          {timed
            ? 'Zamana Karşı: süre zorluğa göre değiştiği için rekorlar seviye başına ayrı tutulur.'
            : daily
              ? 'Günlük mod herkeste aynı bulmacayı gösterir, zorluk seçilemez.'
              : 'Ortalama tahmin sadece kazanılan oyunlardan hesaplanır.'}
        </p>
      </div>
    </div>
  )
}
