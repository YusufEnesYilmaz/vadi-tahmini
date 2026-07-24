import { useEffect } from 'react'
import { CHANGELOG, markChangelogSeen } from '../game/changelog'

interface Props {
  onClose: () => void
}

/**
 * "Yenilikler" paneli — güncellemeyle nelerin değiştiğini oyuncu diliyle listeler.
 * Açıldığı anda "görüldü" işaretlenir → menüdeki 🆕 bandı bir daha çıkmaz
 * (yeni bir changelog girdisi yazılana kadar).
 *
 * Görsel dil: altın halkalı ikon rozeti + tarih HAP'ı + ikon rozetli madde
 * satırları — menü kartları ve Ayarlar bölüm başlıklarıyla aynı aile.
 */
export default function Changelog({ onClose }: Props) {
  useEffect(() => {
    markChangelogSeen()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 sm:items-center ovl"
      style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="anim-pop my-auto flex max-h-[85vh] w-full max-w-md sm:max-w-lg flex-col overflow-hidden rounded-2xl border panel"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Yenilikler">

        {/* Başlık şeridi — altın halkalı rozet + başlık */}
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3"
          style={{ borderColor: 'var(--border)', background: 'linear-gradient(135deg, rgba(var(--gold-glow-rgb), 0.1), transparent 60%)' }}>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl text-lg shadow-inner"
              style={{ background: 'rgba(var(--gold-glow-rgb), 0.12)', border: '1px solid rgba(var(--gold-glow-rgb), 0.35)' }}>
              🆕
            </span>
            <span>
              <span className="block font-display text-lg font-bold leading-tight" style={{ color: 'var(--gold-bright)' }}>
                Yenilikler
              </span>
              <span className="block text-xs" style={{ color: 'var(--text-dim)' }}>
                Son güncellemelerde neler değişti
              </span>
            </span>
          </div>
          <button onClick={onClose} className="card-btn shrink-0 rounded-lg border px-2.5 py-1 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            Kapat
          </button>
        </div>

        {/* Girdiler — en yeni en üstte */}
        <div className="flex flex-col gap-5 overflow-y-auto p-4">
          {CHANGELOG.map((entry, i) => (
            <section key={entry.id}>
              {/* Girdi başlığı: sol altın çizgi + başlık; sağda tarih hapı */}
              <div className="mb-2.5 flex items-center justify-between gap-2 border-l-2 pl-2.5"
                style={{ borderColor: i === 0 ? 'var(--gold)' : 'var(--border)' }}>
                <h3 className="min-w-0 font-display text-base font-bold leading-snug"
                  style={{ color: i === 0 ? 'var(--gold-bright)' : 'var(--text)' }}>
                  {entry.title}
                  {i === 0 && (
                    <span className="ml-2 inline-block rounded-full px-2 py-0.5 align-middle text-[10px] font-extrabold tracking-wider"
                      style={{ background: 'var(--gold)', color: 'var(--bg)' }}>
                      YENİ
                    </span>
                  )}
                </h3>
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-dim)', background: 'var(--bg-input)' }}>
                  {entry.date}
                </span>
              </div>

              {/* Maddeler: ikon rozeti + metin */}
              <ul className="flex flex-col gap-2">
                {entry.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5 rounded-xl border p-2.5"
                    style={{ borderColor: 'var(--border)', background: 'rgba(255, 255, 255, 0.02)' }}>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base shadow-inner"
                      style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border)' }}>
                      {item.icon}
                    </span>
                    <span className="min-w-0 text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
