import { useEffect, useState } from 'react'
import { DIST_BUCKETS, getBestCombo, getBestScore, getDailyStreak, getFullDayStreak, getStats, isStreakAlive } from '../game/stats'

import {
  DIFFICULTIES, SUB_MODES, TOP_MODES, subMeta,
  type Difficulty, type PlaySub, type TopMode,
} from '../game/types'
import DailyCalendar from './DailyCalendar'

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
  const [detail, setDetail] = useState<PlaySub | null>(null) // dağılımı açılan mod

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const daily = top === 'daily'
  const timed = top === 'timed'
  const streak = getDailyStreak()
  const fullStreak = getFullDayStreak()

  // Karışığın kendi rekor tablosu var; Günlük'te mix yok
  const subIds: PlaySub[] = daily ? SUB_MODES.map((m) => m.id) : [...SUB_MODES.map((m) => m.id), 'mix']
  const rows = subIds.map((id) => ({ mode: subMeta(id), s: getStats(top, id, diff) }))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 sm:items-center"
      style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="anim-pop my-auto w-full max-w-2xl rounded-2xl border p-5 shadow-2xl"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="İstatistikler">

        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold" style={{ color: 'var(--gold-bright)' }}>İstatistikler</h2>
          <button onClick={onClose} className="card-btn rounded-xl border px-3 py-1 text-sm"
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
                color: top === m.id ? 'var(--on-gold)' : 'var(--text-dim)',
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

        {/* İki seri: gevşek (en az 1 mod) + prestij (6/6 tam gün) */}
        {daily && (
          <div className="mt-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-center gap-2 rounded-xl border py-2 text-sm"
              style={{ borderColor: 'var(--border)' }}
              title="Üst üste günlük oynanan gün — en az 1 modu tamamlamak yeter">
              <span style={{ color: 'var(--text-dim)' }}>Gün serisi</span>
              <b style={{ color: 'var(--gold)' }}>🔥 {isStreakAlive(streak) ? streak.streak : 0}</b>
              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>· en iyi {streak.best}</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-xl border py-2 text-sm"
              style={{ borderColor: 'var(--border)' }}
              title="Üst üste 6 modun da tamamlandığı gün — sonuç önemsiz">
              <span style={{ color: 'var(--text-dim)' }}>Tam gün serisi</span>
              <b style={{ color: 'var(--gold)' }}>⭐ {isStreakAlive(fullStreak) ? fullStreak.streak : 0}</b>
              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>· en iyi {fullStreak.best}</span>
            </div>
          </div>
        )}

        {/* Mod mod döküm — satıra dokununca tahmin dağılımı açılır */}
        <div className="mt-3 flex flex-col gap-2">
          {rows.map(({ mode, s }) => {
            const avg = s.won > 0 ? (s.totalGuesses / s.won).toFixed(1) : '—'
            const open = detail === mode.id
            const maxDist = Math.max(...s.dist, 1)
            return (
              <div key={mode.id} className="rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                <button onClick={() => setDetail(open ? null : mode.id)} disabled={s.played === 0 || timed}
                  className="flex w-full items-center gap-3 px-3 pt-2 text-left disabled:cursor-default">
                  <span className="text-lg">{mode.icon}</span>
                  <span className="flex-1 text-sm font-semibold">{mode.name}</span>
                  {s.played === 0 ? (
                    <span className="text-xs" style={{ color: 'var(--text-dim)' }}>henüz oynanmadı</span>
                  ) : !timed && (
                    <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{open ? '▴ kapat' : '▾ dağılım'}</span>
                  )}
                </button>

                {/* Her modun kendi rakamları — üstteki özet bunların toplamı */}
                {s.played > 0 && (
                  <div className="grid grid-cols-4 gap-1 px-3 pb-2 pt-1">
                    {(timed
                      ? [
                          { v: String(s.played), l: 'tur' },
                          { v: String(getBestScore(mode.id, diff)), l: 'en iyi skor' },
                          { v: (s.totalScore / s.played).toFixed(1), l: 'ort. skor' },
                          { v: `🔥${getBestCombo(mode.id, diff)}`, l: "pas'sız seri" },
                        ]
                      : [
                          { v: String(s.played), l: 'oynanan' },
                          { v: pct(s.won, s.played), l: 'kazanma' },
                          { v: avg, l: 'ort. tahmin' },
                          { v: String(s.firstTry), l: 'tek seferde' },
                        ]
                    ).map((t) => (
                      <div key={t.l} className="rounded-xl py-1 text-center" style={{ background: 'var(--bg-input)' }}>
                        <div className="font-display text-base font-extrabold leading-tight" style={{ color: 'var(--gold-bright)' }}>{t.v}</div>
                        <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>{t.l}</div>
                      </div>
                    ))}
                  </div>
                )}

                {open && !timed && (
                  <div className="anim-row border-t px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-dim)' }}>
                      <span>Kazanma: <b style={{ color: 'var(--text)' }}>{pct(s.won, s.played)}</b></span>
                      <span>Seri: <b style={{ color: 'var(--text)' }}>{s.currentStreak}</b> (en iyi {s.bestStreak})</span>
                      <span>Tek seferde seri: <b style={{ color: 'var(--text)' }}>{s.firstTryStreak}</b> (en iyi {s.bestFirstTryStreak})</span>
                    </div>
                    {/* Tahmin dağılımı: kaç oyunu kaç denemede bitirdi */}
                    {s.dist.map((n, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-5 shrink-0 text-right text-xs tabular-nums"
                          style={{ color: 'var(--text-dim)' }}>
                          {i + 1 === DIST_BUCKETS ? `${DIST_BUCKETS}+` : i + 1}
                        </span>
                        <div className="h-4 flex-1 overflow-hidden rounded" style={{ background: 'var(--bg-input)' }}>
                          <div className="flex h-full items-center justify-end rounded pr-1 text-xs font-bold"
                            style={{
                              width: `${Math.max((n / maxDist) * 100, n > 0 ? 12 : 0)}%`,
                              background: i === 0 ? 'var(--correct)' : 'var(--gold)',
                              color: 'var(--on-gold)',
                            }}>
                            {n > 0 && n}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Günlük takvim */}
        {daily && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
              Takvim
            </h3>
            <DailyCalendar />
          </div>
        )}

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
