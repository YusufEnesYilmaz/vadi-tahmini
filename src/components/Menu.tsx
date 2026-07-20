import { useState } from 'react'
import { PATCH } from '../game/data'
import { getDifficulty, RULES, setDifficulty as saveDifficulty } from '../game/difficulty'
import { getBestScore, getDailyState, getStats } from '../game/stats'
import { DIFFICULTIES, MIX_MODE, SUB_MODES, TOP_MODES, type Difficulty, type PlaySub, type TopMode } from '../game/types'
import DailyPanel from './DailyPanel'
import DifficultyTable from './DifficultyTable'
import HowTo from './HowTo'
import Stats from './Stats'

interface Props {
  onPlay: (top: TopMode, sub: PlaySub, diff: Difficulty) => void
  onSettings: () => void
}

export default function Menu({ onPlay, onSettings }: Props) {
  const [top, setTop] = useState<TopMode | null>(null)
  const [howTo, setHowTo] = useState(false)
  const [stats, setStats] = useState(false)
  const [diffInfo, setDiffInfo] = useState(false)
  const [diff, setDiff] = useState<Difficulty>(getDifficulty)

  function pickDifficulty(d: Difficulty) {
    setDiff(d)
    saveDifficulty(d) // tercih hatırlansın
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 pb-10 pt-12">
      <header className="text-center">
        <h1 className="font-display text-4xl font-bold" style={{ color: 'var(--gold-bright)' }}>
          Vadi <span style={{ color: 'var(--gold)' }}>Tahmini</span>
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-dim)' }}>
          Bil bakalım, şampiyon kim?
        </p>
      </header>

      {!top ? (
        <div className="flex w-full flex-col gap-3">
          {/* Masaüstünde üç mod yan yana — tek sütun geniş kapta boşluğa yayılıyordu */}
          <div className="grid gap-3 sm:grid-cols-3">
            {TOP_MODES.map((m) => (
              <button key={m.id} onClick={() => setTop(m.id)}
                className="card-btn flex items-center gap-4 rounded-xl border p-4 text-left sm:flex-col sm:items-start"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <span className="text-3xl">{m.icon}</span>
                <span>
                  <span className="block text-lg font-bold" style={{ color: 'var(--gold-bright)' }}>{m.name}</span>
                  <span className="block text-sm" style={{ color: 'var(--text-dim)' }}>{m.desc}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button onClick={() => setHowTo(true)} className="card-btn rounded-xl border p-3 text-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
              ❓ Nasıl
            </button>
            <button onClick={() => setStats(true)} className="card-btn rounded-xl border p-3 text-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
              📊 İstatistik
            </button>
            <button onClick={onSettings} className="card-btn rounded-xl border p-3 text-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
              ⚙ Ayarlar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3">
          <button onClick={() => setTop(null)} className="card-btn self-start rounded-xl border px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            ← Geri
          </button>
          <h2 className="text-center text-lg font-bold" style={{ color: 'var(--gold)' }}>
            {TOP_MODES.find((m) => m.id === top)!.name} — ne tahmin edeceksin?
          </h2>

          {top === 'daily' && <DailyPanel />}

          {/* Zorluk şeridi — Günlük'te yok: herkes aynı şartlarda oynamalı */}
          {top !== 'daily' && (
            <div>
              <div className="flex w-full overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                {DIFFICULTIES.map((d) => (
                  <button key={d.id} onClick={() => pickDifficulty(d.id)}
                    className="flex-1 px-1 py-2 text-xs font-bold transition-colors sm:text-sm"
                    style={{
                      background: diff === d.id ? 'var(--gold)' : 'transparent',
                      color: diff === d.id ? 'var(--on-gold)' : 'var(--text-dim)',
                    }}>
                    {d.name}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
                {top === 'timed'
                  ? `İpuçları ve süre değişir (${RULES[diff].timedSeconds} sn) · skorlar seviye başına ayrı`
                  : 'İpuçlarının ne zaman açıldığını belirler · istatistikler seviye başına ayrı'}
              </p>
              <button onClick={() => setDiffInfo((v) => !v)}
                className="mx-auto mt-1 block text-xs underline underline-offset-2"
                style={{ color: 'var(--gold)' }}>
                {diffInfo ? 'Karşılaştırmayı gizle' : 'Seviyeler ne değiştiriyor?'}
              </button>
              {diffInfo && (
                <div className="anim-pop mt-2 rounded-xl border p-3"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                  <DifficultyTable />
                </div>
              )}
            </div>
          )}

          {/* Alt modlar da geniş ekranda ikişerli */}
          <div className="grid gap-3 sm:grid-cols-2">
          {SUB_MODES.map((m) => {
            const dailyDone = top === 'daily' && getDailyState(m.id).done
            const stats = getStats(top, m.id, diff)
            const info =
              top === 'timed'
                ? `En iyi: ${getBestScore(m.id, diff)}`
                : top === 'daily' && dailyDone
                  ? '✓ Bugün tamamlandı'
                  : stats.played > 0
                    ? `Seri: ${stats.currentStreak}`
                    : ''
            return (
              <button key={m.id} onClick={() => onPlay(top, m.id, diff)}
                className="card-btn flex items-center gap-4 rounded-xl border p-4 text-left"
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

          {/* Karışık — Günlük'te yok (herkes aynı bulmacayı çözmeli). Tam genişlik, altında ayrı dursun */}
          {top !== 'daily' && (() => {
            const mixStats = getStats(top, 'mix', diff)
            const info = top === 'timed'
              ? `En iyi: ${getBestScore('mix', diff)}`
              : mixStats.played > 0 ? `Seri: ${mixStats.currentStreak}` : ''
            return (
              <button onClick={() => onPlay(top, 'mix', diff)}
                className="card-btn flex items-center gap-4 rounded-xl border p-4 text-left"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--gold)' }}>
                <span className="text-3xl">{MIX_MODE.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold" style={{ color: 'var(--gold-bright)' }}>{MIX_MODE.name}</span>
                  <span className="block text-sm" style={{ color: 'var(--text-dim)' }}>
                    {top === 'timed' ? 'Her soru başka tipten (Klasik hariç)' : 'Her soru başka tipten gelsin'}
                  </span>
                </span>
                {info && <span className="shrink-0 text-xs" style={{ color: 'var(--text-dim)' }}>{info}</span>}
              </button>
            )
          })()}
        </div>
      )}

      <footer className="mt-4 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
        Patch {PATCH} · Riot Games ile ilişkili değildir
      </footer>

      {howTo && <HowTo onClose={() => setHowTo(false)} />}
      {stats && <Stats initialDifficulty={diff} onClose={() => setStats(false)} />}
    </div>
  )
}
