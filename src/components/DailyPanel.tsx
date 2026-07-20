import { useEffect, useState } from 'react'
import { copyToClipboard } from '../game/share'
import { getDailyState, getDailyStreak, isStreakAlive } from '../game/stats'
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
  const done = SUB_MODES.filter((m) => getDailyState(m.id).won)
  const allDone = done.length === SUB_MODES.length

  /** Günün tamamını tek kartta paylaş — mod mod ayrı ayrı paylaşmaya gerek kalmasın */
  async function shareDay() {
    const lines = SUB_MODES.map((m) => {
      const st = getDailyState(m.id)
      return `${m.icon} ${m.name}: ${st.won ? `${st.guesses.length} deneme` : '—'}`
    })
    const text = [
      `Vadi Tahmini — Günlük ${todayKey()}`,
      `${done.length}/${SUB_MODES.length} mod tamam${streak.streak > 1 ? ` · 🔥 ${streak.streak} gün` : ''}`,
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
          Bugün: <b style={{ color: 'var(--gold)' }}>{done.length}/{SUB_MODES.length}</b> mod
        </span>
        <span className="text-sm" title="Üst üste günlük çözülen gün sayısı"
          style={{ color: alive && streak.streak > 0 ? 'var(--gold)' : 'var(--text-dim)' }}>
          🔥 {alive ? streak.streak : 0} gün{streak.best > 0 && ` · en iyi ${streak.best}`}
        </span>
      </div>

      {/* Hangi modlar bitti — tek bakışta */}
      <div className="flex flex-wrap gap-2">
        {SUB_MODES.map((m) => {
          const won = getDailyState(m.id).won
          return (
            <span key={m.id} className="rounded-md border px-2 py-1 text-xs"
              style={{
                borderColor: won ? 'var(--correct)' : 'var(--border)',
                color: won ? 'var(--correct)' : 'var(--text-dim)',
              }}>
              {won ? '✓' : '○'} {m.name}
            </span>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
          Yeni bulmacalar: <b className="tabular-nums" style={{ color: 'var(--text)' }}>{hhmmss(left)}</b>
        </span>
        {done.length > 0 && (
          <button onClick={shareDay} className="card-btn rounded-xl border px-3 py-1.5 text-xs font-semibold"
            style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
            {copied ? '✓ Kopyalandı' : allDone ? '🏆 Günü paylaş' : 'Günü paylaş'}
          </button>
        )}
      </div>
    </div>
  )
}
