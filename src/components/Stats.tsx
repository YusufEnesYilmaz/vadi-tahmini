import { useEffect, useState } from 'react'
import { aggregateStats, DIST_BUCKETS, getBestCombo, getBestScore, getDailyStreak, getFullDayStreak, getStats, isStreakAlive } from '../game/stats'

import {
  DAILY_SUBS, DIFFICULTIES, SUB_MODES, TOP_MODES, subMeta,
  type Difficulty, type PlaySub, type TopMode,
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
  const subIds: PlaySub[] = daily ? DAILY_SUBS.map((m) => m.id) : [...SUB_MODES.map((m) => m.id), 'mix']
  // Oynananlar önce (played desc); eşitler sabit sıralamada orijinal mod sırasını korur
  const rows = subIds
    .map((id) => ({ mode: subMeta(id), s: getStats(top, id, diff) }))
    .sort((a, b) => b.s.played - a.s.played)

  // Oynananları öne al, oynanmayanları tek satıra topla (sayı duvarı olmasın)
  const played = rows.filter((r) => r.s.played > 0)
  const unplayed = rows.filter((r) => r.s.played === 0)
  // Seçili modun detayı liste ALTINDA sabit alanda gösterilir — liste kımıldamaz.
  // Üst mod değişince eski seçim bu listede olmayabilir; find ile güvenli.
  const selectedRow = played.find((r) => r.mode.id === detail) ?? null

  // Üst mod + zorluk için toplu özet — mod satırları bunun dökümü
  const summary = aggregateStats(rows.map((r) => r.s))
  const timedBest = timed ? Math.max(0, ...subIds.map((id) => getBestScore(id, diff))) : 0
  const timedCombo = timed ? Math.max(0, ...subIds.map((id) => getBestCombo(id, diff))) : 0
  const summaryTiles = timed
    ? [
        { v: String(summary.played), l: 'toplam tur' },
        { v: String(timedBest), l: 'en iyi skor' },
        { v: String(summary.totalScore), l: 'toplam doğru' },
        { v: `🔥${timedCombo}`, l: 'en uzun seri' },
      ]
    : [
        { v: String(summary.played), l: 'toplam oyun' },
        { v: pct(summary.won, summary.played), l: 'kazanma' },
        { v: String(summary.bestStreak), l: 'en iyi seri' },
        { v: String(summary.firstTry), l: 'tek seferde' },
      ]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 sm:items-center ovl"
      style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="anim-pop my-auto w-full max-w-lg rounded-2xl border p-4 panel"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="İstatistikler">

        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold-bright)' }}>İstatistikler</h2>
          <button onClick={onClose} className="card-btn rounded-lg border px-2.5 py-1 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            Kapat
          </button>
        </div>

        {/* Üst mod sekmeleri */}
        <div className="mt-3 flex overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border)' }}>
          {TOP_MODES.map((m) => (
            <button key={m.id} onClick={() => setTop(m.id)}
              className="flex-1 px-2 py-1.5 text-xs font-semibold"
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
          <div className="mt-1.5 flex overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            {DIFFICULTIES.map((d) => (
              <button key={d.id} onClick={() => setDiff(d.id)}
                className="flex-1 px-1 py-1 text-xs font-medium"
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
          <div className="mt-2.5 flex flex-col gap-1">
            <div className="flex items-center justify-center gap-2 rounded-lg border py-1.5 text-xs"
              style={{ borderColor: 'var(--border)' }}
              title="Üst üste günlük oynanan gün — en az 1 modu tamamlamak yeter">
              <span style={{ color: 'var(--text-dim)' }}>Gün serisi</span>
              <b style={{ color: 'var(--gold)' }}>🔥 {isStreakAlive(streak) ? streak.streak : 0}</b>
              <span style={{ color: 'var(--text-dim)' }}>· en iyi {streak.best}</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-lg border py-1.5 text-xs"
              style={{ borderColor: 'var(--border)' }}
              title={`Üst üste ${DAILY_SUBS.length} modun da tamamlandığı gün — sonuç önemsiz`}>
              <span style={{ color: 'var(--text-dim)' }}>Tam gün serisi</span>
              <b style={{ color: 'var(--gold)' }}>⭐ {isStreakAlive(fullStreak) ? fullStreak.streak : 0}</b>
              <span style={{ color: 'var(--text-dim)' }}>· en iyi {fullStreak.best}</span>
            </div>
          </div>
        )}

        {/* Toplu özet — aşağıdaki mod satırları bunun dökümü */}
        {summary.played > 0 ? (
          <div className="mt-2.5 rounded-xl border p-2.5"
            style={{ borderColor: 'var(--gold-soft)', background: 'var(--bg-input)' }}>
            <div className="mb-1.5 text-xs uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
              Tüm modlar · özet
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {summaryTiles.map((t) => (
                <div key={t.l} className="rounded-lg py-1.5 text-center" style={{ background: 'var(--bg-card)' }}>
                  <div className="font-display text-base font-bold leading-tight" style={{ color: 'var(--gold)' }}>{t.v}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>{t.l}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-2.5 rounded-xl border p-3 text-center text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            Bu modda henüz oyun yok — bir tur oyna, buraya işlensin.
          </div>
        )}

        {/* Mod listesi — STATİK: satır tıklanınca yalnız seçilir, hiçbir satır
            yer değiştirmez. Detay aşağıda sabit alanda açılır (master-detay). */}
        {played.length > 0 && (
          <div className="mt-2.5 flex flex-col gap-1.5">
            {played.map(({ mode, s }) => {
              const sel = detail === mode.id
              const head = timed
                ? { main: `🏆 ${getBestScore(mode.id, diff)}`, sub: `${s.played} tur` }
                : { main: pct(s.won, s.played), sub: `${s.played} oyun` }
              return (
                <button key={mode.id} onClick={() => setDetail(sel ? null : mode.id)} aria-pressed={sel}
                  className="card-btn flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left"
                  style={{
                    borderColor: sel ? 'var(--gold)' : 'var(--border)',
                    background: sel ? 'var(--gold-soft)' : 'transparent',
                  }}>
                  <span className="text-base">{mode.icon}</span>
                  <span className="flex-1 text-sm font-medium" style={{ color: sel ? 'var(--gold-bright)' : 'var(--text)' }}>{mode.name}</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--gold)' }}>{head.main}</span>
                  <span className="hidden text-xs sm:inline" style={{ color: 'var(--text-dim)' }}>· {head.sub}</span>
                  <span className="w-3.5 shrink-0 text-center text-xs" style={{ color: sel ? 'var(--gold)' : 'var(--text-dim)' }}>›</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Seçili modun detayı — SABİT alan; liste kımıldamaz, yalnız burası değişir */}
        {selectedRow && (() => {
          const { mode, s } = selectedRow
          const avg = s.won > 0 ? (s.totalGuesses / s.won).toFixed(1) : '—'
          const maxDist = Math.max(...s.dist, 1)
          const tiles = timed
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
          return (
            <div className="anim-row mt-2 rounded-lg border px-3 py-2.5"
              style={{ borderColor: 'var(--gold-soft)', background: 'var(--bg-input)' }}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-base">{mode.icon}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{mode.name}</span>
                <button onClick={() => setDetail(null)} className="ml-auto text-xs" style={{ color: 'var(--text-dim)' }}>kapat ✕</button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {tiles.map((t) => (
                  <div key={t.l} className="rounded-lg py-1 text-center" style={{ background: 'var(--bg-card)' }}>
                    <div className="font-display text-sm font-bold leading-tight" style={{ color: 'var(--gold)' }}>{t.v}</div>
                    <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>{t.l}</div>
                  </div>
                ))}
              </div>

              {/* Seri + tahmin dağılımı yalnız şampiyon/klasik türü modlarda anlamlı (Zamana Karşı'da yok) */}
              {!timed && (
                <>
                  <div className="mb-1.5 mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                    <span>Seri: <b style={{ color: 'var(--text)' }}>{s.currentStreak}</b> (en iyi {s.bestStreak})</span>
                    <span>Tek seferde seri: <b style={{ color: 'var(--text)' }}>{s.firstTryStreak}</b> (en iyi {s.bestFirstTryStreak})</span>
                  </div>
                  {s.dist.map((n, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-4 shrink-0 text-right text-[10px] tabular-nums" style={{ color: 'var(--text-dim)' }}>
                        {i + 1 === DIST_BUCKETS ? `${DIST_BUCKETS}+` : i + 1}
                      </span>
                      <div className="h-3 flex-1 overflow-hidden rounded" style={{ background: 'var(--bg-card)' }}>
                        <div className="flex h-full items-center justify-end rounded pr-1 text-[10px] font-semibold"
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
                </>
              )}
            </div>
          )
        })()}

        {/* Oynanmayan modlar 6 boş satır yerine tek satırda toplanır */}
        {unplayed.length > 0 && (
          <p className="mt-1.5 px-1 text-[11px]" style={{ color: 'var(--text-dim)' }}>
            <span className="uppercase tracking-wide">Henüz oynanmadı:</span>{' '}
            {unplayed.map((r) => r.mode.name).join(' · ')}
          </p>
        )}

        {/* Takvim menüdeki 📅 butonuna taşındı (kompakt istatistik görünümünü şişiriyordu) */}
        {daily && (
          <p className="mt-3 text-center text-[11px]" style={{ color: 'var(--text-dim)' }}>
            Gün gün geçmiş için menüdeki 📅 Takvim'e bak.
          </p>
        )}

        <p className="mt-3 text-center text-[11px]" style={{ color: 'var(--text-dim)' }}>
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
