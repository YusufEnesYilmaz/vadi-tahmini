import { useState } from 'react'
import { PATCH } from '../game/data'
import { getBestScore, getDailyState, getStats } from '../game/stats'
import { SUB_MODES, TOP_MODES, type SubMode, type TopMode } from '../game/types'

interface Props {
  onPlay: (top: TopMode, sub: SubMode) => void
  onSettings: () => void
}

export default function Menu({ onPlay, onSettings }: Props) {
  const [top, setTop] = useState<TopMode | null>(null)

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 pb-10 pt-12">
      <header className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: 'var(--gold-bright)' }}>
          Vadi <span style={{ color: 'var(--gold)' }}>Tahmini</span>
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-dim)' }}>
          Bil bakalım, şampiyon kim?
        </p>
      </header>

      {!top ? (
        <div className="flex w-full flex-col gap-3">
          {TOP_MODES.map((m) => (
            <button key={m.id} onClick={() => setTop(m.id)}
              className="flex items-center gap-4 rounded-xl border p-4 text-left transition-transform active:scale-[0.98]"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <span className="text-3xl">{m.icon}</span>
              <span>
                <span className="block text-lg font-bold" style={{ color: 'var(--gold-bright)' }}>{m.name}</span>
                <span className="block text-sm" style={{ color: 'var(--text-dim)' }}>{m.desc}</span>
              </span>
            </button>
          ))}
          <button onClick={onSettings} className="mt-2 rounded-xl border p-3 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            ⚙ Ayarlar & Güncelleme
          </button>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3">
          <button onClick={() => setTop(null)} className="self-start rounded-lg border px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            ← Geri
          </button>
          <h2 className="text-center text-lg font-bold" style={{ color: 'var(--gold)' }}>
            {TOP_MODES.find((m) => m.id === top)!.name} — ne tahmin edeceksin?
          </h2>
          {SUB_MODES.map((m) => {
            const dailyDone = top === 'daily' && getDailyState(m.id).done
            const stats = getStats(top, m.id)
            const info =
              top === 'timed'
                ? `En iyi: ${getBestScore(m.id)}`
                : top === 'daily' && dailyDone
                  ? '✓ Bugün tamamlandı'
                  : stats.played > 0
                    ? `Seri: ${stats.currentStreak}`
                    : ''
            return (
              <button key={m.id} onClick={() => onPlay(top, m.id)}
                className="flex items-center gap-4 rounded-xl border p-4 text-left transition-transform active:scale-[0.98]"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: dailyDone ? 'var(--correct)' : 'var(--border)',
                }}>
                <span className="text-3xl">{m.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold" style={{ color: 'var(--gold-bright)' }}>{m.name}</span>
                  <span className="block text-sm" style={{ color: 'var(--text-dim)' }}>{m.desc}</span>
                </span>
                {info && <span className="shrink-0 text-xs" style={{ color: dailyDone ? 'var(--correct)' : 'var(--text-dim)' }}>{info}</span>}
              </button>
            )
          })}
        </div>
      )}

      <footer className="mt-4 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
        Patch {PATCH} · Riot Games ile ilişkili değildir
      </footer>
    </div>
  )
}
