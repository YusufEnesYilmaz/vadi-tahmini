import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { useModalFocusTrap } from './useModalFocusTrap'

interface Props {
  onChampions: () => void
  onItems: () => void
  onHowTo: () => void
  onClose: () => void
}

const GUIDE_GLYPHS = {
  champions: (
    <>
      <path d="M12 6.6C10.4 5.2 7.6 4.7 4.7 5.4v12c2.9-.7 5.7-.2 7.3 1.2 1.6-1.4 4.4-1.9 7.3-1.2v-12C16.4 4.7 13.6 5.2 12 6.6Z" />
      <path d="M12 6.6v12.2" />
    </>
  ),
  items: (
    <>
      <path d="M14.4 4.4 19.6 9.6" />
      <path d="m13.1 5.7 2.5-2.5a2 2 0 0 1 2.8 0l2.4 2.4a2 2 0 0 1 0 2.8l-2.5 2.5" />
      <path d="m3.8 20.2 5.4-1.2 9.2-9.2-4.2-4.2L5 14.8l-1.2 5.4Z" />
      <path d="m12.8 7.2 4.2 4.2" />
    </>
  ),
  howto: (
    <>
      <path d="M12 3.5 4.8 7.2v9.6l7.2 3.7 7.2-3.7V7.2L12 3.5Z" />
      <path d="m8.8 12 2.1 2.1 4.3-4.3" />
    </>
  ),
} as const

function GuideGlyph({ name }: { name: keyof typeof GUIDE_GLYPHS }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      {GUIDE_GLYPHS[name]}
    </svg>
  )
}

function GuideCard({
  icon,
  title,
  desc,
  accentRgb,
  onClick,
}: {
  icon: ReactNode
  title: string
  desc: string
  accentRgb: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card-btn settings-shortcut-card group flex h-full min-h-[172px] flex-col items-start justify-between gap-5 rounded-[26px] border p-4 text-left sm:p-5"
      style={{ '--card-accent-rgb': accentRgb } as CSSProperties}
    >
      <span className="flex w-full items-start gap-4">
        <span className="settings-shortcut-badge grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[20px]" aria-hidden>
          {icon}
        </span>

        <span className="block min-w-0 flex-1 pt-0.5">
          <span className="settings-shortcut-title block text-[1.02rem] font-bold tracking-tight">{title}</span>
          <span className="settings-shortcut-desc mt-1.5 block text-sm leading-6">{desc}</span>
        </span>
      </span>

      <span className="settings-shortcut-card__cta inline-flex items-center gap-2 rounded-full px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.22em]">
        <span>Aç</span>
        <span className="settings-shortcut-card__cta-arrow text-sm" aria-hidden>
          →
        </span>
      </span>
    </button>
  )
}

export default function PlayerGuide({ onChampions, onItems, onHowTo, onClose }: Props) {
  const dialogRef = useModalFocusTrap<HTMLDivElement>()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 sm:items-center ovl"
      style={{ background: 'var(--overlay)' }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="anim-pop my-auto w-full max-w-3xl rounded-2xl border p-5 sm:p-6 panel"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Oyuncu rehberi"
      >
        <div className="flex items-start justify-between gap-4 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--gold-bright)' }}>
              Oyuncu Rehberi
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-dim)' }}>
              Şampiyonlar, eşyalar ve oyun kuralları tek yerde.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="card-btn shrink-0 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-transform hover:scale-105"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          >
            × Kapat
          </button>
        </div>

        <div className="mt-4 grid auto-rows-fr gap-3 sm:grid-cols-3">
          <GuideCard
            icon={<GuideGlyph name="champions" />}
            title="Şampiyonlar"
            desc="Tüm şampiyonları incele, ara ve filtrele."
            accentRgb="var(--hextech-rgb)"
            onClick={onChampions}
          />

          <GuideCard
            icon={<GuideGlyph name="items" />}
            title="Eşyalar"
            desc="Tam eşya listesini aç; açıklama, bileşen ve yükseltmeleri gör."
            accentRgb="var(--gold-glow-rgb)"
            onClick={onItems}
          />

          <GuideCard
            icon={<GuideGlyph name="howto" />}
            title="Nasıl Oynanır"
            desc="Modları, mini oyunları ve eşya modu dahil tüm kuralları oku."
            accentRgb="var(--accent-done-rgb)"
            onClick={onHowTo}
          />
        </div>
      </div>
    </div>
  )
}
