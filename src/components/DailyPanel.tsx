import { useEffect, useState } from 'react'
import { copyToClipboard } from '../game/share'
import { getDailyState, getDailyStreak, getFullDayStreak, isStreakAlive } from '../game/stats'
import { todayKey } from '../game/rng'
import { SUB_MODES } from '../game/types'

/** Gece yarısına kalan süre (sn) */
function secondsToMidnight(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return Math.max(0, Math.round((midnight.getTime() - now.getTime()) / 1000))
}

function hhmmss(total: number): string {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Günlük mod özeti: bugün hangi modlar bitti, seri kaç gün, yeni bulmacaya ne kadar var.
 * Menüde Günlük seçilince mod listesinin üstünde durur.
 */
export default function DailyPanel() {
  const [left, setLeft] = useState(secondsToMidnight)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setLeft(secondsToMidnight()), 1000)
    return () => clearInterval(t)
  }, [])

  const streak = getDailyStreak()
  const alive = isStreakAlive(streak)
  const fullStreak = getFullDayStreak()
  const fullAlive = isStreakAlive(fullStreak)
  const doneCount = SUB_MODES.filter((m) => getDailyState(m.id).done).length // tamamlanan (sonuç önemsiz)
  const allDone = doneCount === SUB_MODES.length

  /** Günün tamamını tek kartta paylaş — mod mod ayrı ayrı paylaşmaya gerek kalmasın */
  async function shareDay() {
    const lines = SUB_MODES.map((m) => {
      const st = getDailyState(m.id)
      return `${m.icon} ${m.name}: ${st.won ? `${st.guesses.length} deneme` : st.done ? '✗' : '—'}`
    })
    const text = [
      `Vadi Tahmini — Günlük ${todayKey()}`,
      `${doneCount}/${SUB_MODES.length} mod tamam${streak.streak > 1 ? ` · 🔥 ${streak.streak} gün` : ''}`,
      ...lines,
    ].join('\n')
    if (await copyToClipboard(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-3"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
          Bugün: <b style={{ color: 'var(--gold)' }}>{doneCount}/{SUB_MODES.length}</b> mod tamam
        </span>
        {/* İki seri: gevşek (en az 1 mod) + prestij (6/6 tam gün) */}
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-sm" title="Üst üste günlük oynanan gün — en az 1 modu tamamlamak yeter (kazanmak şart değil)"
            style={{ color: alive && streak.streak > 0 ? 'var(--gold)' : 'var(--text-dim)' }}>
            🔥 {alive ? streak.streak : 0} gün{streak.best > 0 && ` · en iyi ${streak.best}`}
          </span>
          <span className="text-xs" title="Üst üste 6 modun da tamamlandığı gün — sonuç önemsiz"
            style={{ color: fullAlive && fullStreak.streak > 0 ? 'var(--gold)' : 'var(--text-dim)' }}>
            ⭐ {fullAlive ? fullStreak.streak : 0} tam gün{fullStreak.best > 0 && ` · en iyi ${fullStreak.best}`}
          </span>
        </div>
      </div>

      {/* Hangi modlar bitti — tek bakışta: ✓ kazanıldı, ✗ kaybedildi, ○ oynanmadı */}
      <div className="flex flex-wrap gap-2">
        {SUB_MODES.map((m) => {
          const st = getDailyState(m.id)
          const state = st.won ? 'won' : st.done ? 'lost' : 'none'
          return (
            <span key={m.id} className="rounded-md border px-2 py-1 text-xs"
              style={{
                borderColor: state === 'won' ? 'var(--correct)' : state === 'lost' ? 'var(--danger-text)' : 'var(--border)',
                color: state === 'won' ? 'var(--correct)' : state === 'lost' ? 'var(--danger-text)' : 'var(--text-dim)',
              }}>
              {state === 'won' ? '✓' : state === 'lost' ? '✗' : '○'} {m.name}
            </span>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
          Yeni bulmacalar: <b className="tabular-nums" style={{ color: 'var(--text)' }}>{hhmmss(left)}</b>
        </span>
        {doneCount > 0 && (
          <button onClick={shareDay} className="card-btn rounded-xl border px-3 py-1.5 text-xs font-semibold"
            style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
            {copied ? '✓ Kopyalandı' : allDone ? '🏆 Günü paylaş' : 'Günü paylaş'}
          </button>
        )}
      </div>
    </div>
  )
}
