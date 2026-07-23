import { useEffect, useState } from 'react'
import { copyToClipboard } from '../game/share'
import { getDailyState, getDailyStreak, getFullDayStreak, isStreakAlive } from '../game/stats'
import { todayKey } from '../game/rng'
import { DAILY_SUBS } from '../game/types'

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
  const doneCount = DAILY_SUBS.filter((m) => getDailyState(m.id).done).length // tamamlanan (sonuç önemsiz)
  const allDone = doneCount === DAILY_SUBS.length

  /** Günün tamamını tek kartta paylaş — mod mod ayrı ayrı paylaşmaya gerek kalmasın */
  async function shareDay() {
    const lines = DAILY_SUBS.map((m) => {
      const st = getDailyState(m.id)
      return `${m.icon} ${m.name}: ${st.won ? `${st.guesses.length} deneme` : st.done ? '✗' : '—'}`
    })
    const text = [
      `Vadi Tahmini — Günlük ${todayKey()}`,
      `${doneCount}/${DAILY_SUBS.length} mod tamam${streak.streak > 1 ? ` · 🔥 ${streak.streak} gün` : ''}`,
      ...lines,
    ].join('\n')
    if (await copyToClipboard(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border p-4 shadow-md backdrop-blur-md"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>
          Bugün: <b style={{ color: 'var(--gold-bright)' }}>{doneCount}/{DAILY_SUBS.length}</b> mod tamamlandı
        </span>
        {/* İki seri: gevşek (en az 1 mod) + prestij (8/8 tam gün) */}
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-sm font-bold" title="Üst üste günlük oynanan gün — en az 1 modu tamamlamak yeter"
            style={{ color: alive && streak.streak > 0 ? 'var(--gold-bright)' : 'var(--text-dim)' }}>
            🔥 {alive ? streak.streak : 0} Gün Seri{streak.best > 0 && ` · Rekor: ${streak.best}`}
          </span>
          <span className="text-xs font-semibold" title={`Üst üste ${DAILY_SUBS.length} modun da tamamlandığı gün`}
            style={{ color: fullAlive && fullStreak.streak > 0 ? 'var(--gold)' : 'var(--text-dim)' }}>
            ⭐ {fullAlive ? fullStreak.streak : 0} Tam Gün{fullStreak.best > 0 && ` · Rekor: ${fullStreak.best}`}
          </span>
        </div>
      </div>

      {/* Hangi modlar bitti — tek bakışta: ✓ kazanıldı, ✗ kaybedildi, ○ oynanmadı */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {DAILY_SUBS.map((m) => {
          const st = getDailyState(m.id)
          const state = st.won ? 'won' : st.done ? 'lost' : 'none'
          return (
            <span key={m.id} className="rounded-lg border px-2.5 py-1 text-xs font-bold transition-all"
              style={{
                background: state === 'won' ? 'rgba(var(--accent-done-deep-rgb), 0.12)' : state === 'lost' ? 'rgba(var(--danger-glow-rgb), 0.12)' : 'rgba(255, 255, 255, 0.02)',
                borderColor: state === 'won' ? 'var(--accent-done-deep)' : state === 'lost' ? 'var(--danger-glow)' : 'var(--border)',
                color: state === 'won' ? 'var(--accent-done)' : state === 'lost' ? 'var(--danger-text)' : 'var(--text-dim)',
              }}>
              {state === 'won' ? '✓' : state === 'lost' ? '✗' : '○'} {m.name}
            </span>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
          <span>⏱️ Yenilenmeye:</span>
          <b className="tabular-nums font-bold" style={{ color: 'var(--text)' }}>{hhmmss(left)}</b>
        </span>
        {doneCount > 0 && (
          <button onClick={shareDay} className="card-btn rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all hover:scale-105"
            style={{ borderColor: 'var(--gold)', color: 'var(--gold-bright)' }}>
            {copied ? '✓ Kopyalandı' : allDone ? '🏆 Günü Paylaş' : 'Günü Paylaş'}
          </button>
        )}
      </div>
    </div>
  )
}
