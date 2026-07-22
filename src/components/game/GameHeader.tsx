import { DIFFICULTIES, type Difficulty } from '../../game/types'
import { filterLabel, isAllFilter, type PoolFilter } from '../../game/filter'
import type { Puzzle } from '../../game/puzzle'

interface GameHeaderProps {
  topName: string
  subName: string
  isMix: boolean
  puzzle: Puzzle | null
  timedOver: boolean
  activeMetaIcon: string
  activeMetaName: string
  daily: boolean
  diff: Difficulty
  filter: PoolFilter
  timed: boolean
  timeLeft: number
  finished: boolean
  left: number
  currentStreak: number
  onExit: () => void
  onOpenHowTo: () => void
}

export default function GameHeader({
  topName,
  subName,
  isMix,
  puzzle,
  timedOver,
  activeMetaIcon,
  activeMetaName,
  daily,
  diff,
  filter,
  timed,
  timeLeft,
  finished,
  left,
  currentStreak,
  onExit,
  onOpenHowTo,
}: GameHeaderProps) {
  const diffName = DIFFICULTIES.find((d) => d.id === diff)?.name ?? ''

  return (
    <div
      className="flex w-full items-center justify-between gap-2 border-b pt-3 pb-2"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={onExit}
          className="card-btn rounded-xl border px-3 py-1.5 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
        >
          ← Menü
        </button>
        <button
          onClick={onOpenHowTo}
          aria-label="Nasıl oynanır"
          className="card-btn rounded-xl border px-2.5 py-1.5 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
        >
          ?
        </button>
      </div>

      <span className="min-w-0 truncate text-center text-sm font-semibold sm:text-base" style={{ color: 'var(--gold)' }}>
        {topName} · {subName}
        {isMix && puzzle && !timedOver && (
          <span className="block text-xs font-normal" style={{ color: 'var(--gold-bright)' }}>
            🎲 {activeMetaIcon} {activeMetaName}
          </span>
        )}
        {!daily && !isMix && (
          <span className="block text-xs font-normal" style={{ color: 'var(--text-dim)' }}>
            {diffName}
          </span>
        )}
        {!daily && !isAllFilter(filter) && (
          <span className="block text-xs font-normal" style={{ color: 'var(--gold)' }}>
            🎯 {filterLabel(filter)}
          </span>
        )}
      </span>

      {timed && puzzle && !timedOver ? (
        <span
          className={`rounded-xl px-3 py-1.5 font-mono text-lg font-bold ${timeLeft <= 10 ? 'anim-pulse' : ''}`}
          style={{ background: timeLeft <= 10 ? 'var(--danger)' : 'var(--bg-card)', color: '#fff' }}
        >
          {timeLeft}s
        </span>
      ) : (
        <span className="w-16 text-right text-sm" style={{ color: 'var(--text-dim)' }}>
          {timed ? (
            '⏱'
          ) : finished ? (
            `Seri: ${currentStreak}`
          ) : (
            <span style={{ color: left <= 2 ? 'var(--danger-text)' : 'var(--text-dim)' }}>{left} hak</span>
          )}
        </span>
      )}
    </div>
  )
}
