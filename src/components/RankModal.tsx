import { useEffect } from 'react'
import { SUMMONER_TITLES, titleFor, nextTitle } from '../game/rank'
import RankEmblem from './RankEmblem'

interface Props {
  /** En iyi günlük seri — unvan kademesini BELİRLER (kırılsa da düşmez) */
  best: number
  /** Güncel (canlı) günlük seri — yalnız ekranda bağlam olarak gösterilir */
  current: number
  onClose: () => void
}

/**
 * Sihirdar unvanının açıklaması + tüm kademelerin listesi.
 * Menüdeki unvan rozetine tıklayınca açılır. Amaç: oyuncu unvanının NEYE göre
 * (ulaştığı en uzun günlük seri — anlık serisi ya da şampiyon sayısı DEĞİL)
 * yükseldiğini ve merdivenin tamamını görebilsin. Kademe verisi `rank.ts`'ten.
 */
export default function RankModal({ best, current, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const currentTitle = titleFor(best)
  const next = nextTitle(best)
  const remaining = next ? next.min - best : 0
  // İlerleme çubuğu: mevcut kademenin başından bir sonrakinin eşiğine kadar
  const pct = next ? Math.round(((best - currentTitle.min) / (next.min - currentTitle.min)) * 100) : 100

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 sm:items-center ovl"
      style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="anim-pop my-auto w-full max-w-md rounded-2xl border p-4 panel"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Sihirdar unvanları">

        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold-bright)' }}>🎖️ Sihirdar Unvanları</h2>
          <button onClick={onClose} className="card-btn rounded-lg border px-2.5 py-1 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            Kapat
          </button>
        </div>

        {/* Açıklama: unvan NEYE göre yükseliyor */}
        <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
          Unvanın, ulaştığın <b style={{ color: 'var(--text)' }}>en uzun günlük seriye</b> göre yükselir —
          yani üst üste kaç gün Günlük bulmaca oynadığına. Bir gün kaçırıp serin (🔥) kırılsa bile
          <b style={{ color: 'var(--text)' }}> unvanın düşmez.</b>
        </p>

        {/* Mevcut durum + ilerleme */}
        <div className="mt-3 rounded-xl border p-3" style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2.5 font-bold">
              <RankEmblem tier={currentTitle} size={48} />
              <span style={{ color: currentTitle.color }}>{currentTitle.title}</span>
            </span>
            <span className="text-right text-xs" style={{ color: 'var(--text-dim)' }}>
              <span className="block font-bold" style={{ color: 'var(--gold-bright)' }}>en iyi: {best} gün</span>
              <span className="block">şu an 🔥 {current} gün</span>
            </span>
          </div>

          {next ? (
            <>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: next.color }} />
              </div>
              <p className="mt-1.5 text-xs" style={{ color: 'var(--text-dim)' }}>
                <b style={{ color: next.color }}>{next.icon} {next.title}</b> için{' '}
                <b style={{ color: 'var(--text)' }}>{remaining}</b> gün daha seri.
              </p>
            </>
          ) : (
            <p className="mt-1.5 text-xs" style={{ color: 'var(--gold-bright)' }}>En yüksek unvandasın 👑</p>
          )}
        </div>

        {/* Tüm kademeler */}
        <div className="mt-3 flex flex-col gap-1.5">
          {SUMMONER_TITLES.map((t) => {
            const reached = best >= t.min
            const isCurrent = t.title === currentTitle.title
            return (
              <div key={t.title}
                className="flex items-center gap-3 rounded-lg border p-2.5"
                style={{
                  borderColor: isCurrent ? 'var(--gold)' : 'var(--border)',
                  background: isCurrent ? 'var(--gold-soft)' : 'transparent',
                  opacity: reached ? 1 : 0.5,
                }}>
                <RankEmblem tier={t} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold" style={{ color: t.color }}>{t.title}</span>
                  <span className="block text-xs" style={{ color: 'var(--text-dim)' }}>{t.blurb}</span>
                </span>
                <span className="shrink-0 text-right text-xs" style={{ color: reached ? 'var(--accent-done)' : 'var(--text-dim)' }}>
                  {t.min === 0 ? 'Başlangıç' : `${t.min} gün`}
                  {reached && t.min > 0 && <span className="block" style={{ color: 'var(--accent-done)' }}>✓</span>}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
