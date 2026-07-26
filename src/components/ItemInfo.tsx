import { useEffect, useMemo } from 'react'
import { ITEMS, itemById, itemIconUrl, partById } from '../game/data'
import { buildsInto } from '../game/itemGuide'
import type { Item } from '../game/types'
import { useModalFocusTrap } from './useModalFocusTrap'

interface Props {
  item: Item
  onClose: () => void
  onSelect?: (item: Item) => void
}

interface RelatedItem {
  id: string
  name: string
  img: string
  gold?: number
  item?: Item
}

function resolveRelatedItem(id: string): RelatedItem | null {
  const guideItem = itemById(id)
  if (guideItem) {
    return {
      id,
      name: guideItem.name,
      img: guideItem.img,
      gold: guideItem.gold,
      item: guideItem,
    }
  }

  const part = partById(id)
  if (!part) return null

  return {
    id,
    name: part.name,
    img: part.img,
    gold: part.gold,
  }
}

function RelatedCard({
  entry,
  onClick,
  actionLabel,
}: {
  entry: RelatedItem
  onClick?: () => void
  actionLabel?: string
}) {
  const content = (
    <>
      <div
        className="guide-card-media h-14 w-14 shrink-0 rounded-2xl border p-2.5"
        style={{
          borderColor: 'rgba(var(--gold-rgb), 0.22)',
          background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.9), rgba(var(--bg-rgb), 0.92))',
        }}
      >
        <div className="guide-card-halo" aria-hidden />
        <img
          src={itemIconUrl(entry.img)}
          alt=""
          loading="lazy"
          className="guide-card-portrait h-full w-full object-contain"
        />
        <div className="guide-card-ring" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {entry.name}
        </span>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {entry.gold != null && (
            <span
              className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold tabular-nums"
              style={{
                borderColor: 'rgba(var(--gold-rgb), 0.28)',
                background: 'rgba(var(--gold-rgb), 0.08)',
                color: 'var(--gold-bright)',
              }}
            >
              {entry.gold} altın
            </span>
          )}

          {actionLabel && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--hextech)' }}>
              {actionLabel}
            </span>
          )}
        </div>
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="guide-card card-btn flex items-center gap-3 rounded-2xl border p-3 text-left"
        style={{
          borderColor: 'rgba(var(--gold-rgb), 0.16)',
          background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.9), rgba(var(--bg-rgb), 0.94))',
        }}
      >
        {content}
      </button>
    )
  }

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border p-3"
      style={{
        borderColor: 'rgba(var(--gold-rgb), 0.16)',
        background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.9), rgba(var(--bg-rgb), 0.94))',
      }}
    >
      {content}
    </div>
  )
}

export default function ItemInfo({ item, onClose, onSelect }: Props) {
  const dialogRef = useModalFocusTrap<HTMLDivElement>()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const components = useMemo(
    () => item.from.map(resolveRelatedItem).filter((entry): entry is RelatedItem => entry != null),
    [item.from],
  )
  const upgrades = useMemo(() => buildsInto(item.id, ITEMS), [item.id])
  const componentGoldTotal = components.reduce((sum, entry) => sum + (entry.gold ?? 0), 0)
  const description = item.desc?.trim()
  const summary = item.plain?.trim()
  const showSummary = Boolean(summary && summary !== description)
  const hasExtraSections = Boolean(description || components.length || upgrades.length)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 sm:items-center ovl"
      style={{ background: 'var(--overlay)' }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="anim-pop my-auto flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border panel"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${item.name} eşya bilgisi`}
      >
        <div className="relative overflow-hidden border-b p-5 sm:p-6" style={{ borderColor: 'var(--border)' }}>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-28"
            aria-hidden
            style={{
              background:
                'radial-gradient(circle at 16% 0, rgba(var(--hextech-rgb), 0.18), transparent 34%), radial-gradient(circle at 100% 0, rgba(var(--gold-glow-rgb), 0.24), transparent 40%)',
            }}
          />

          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="card-btn absolute right-4 top-4 rounded-xl border px-3 py-1.5 text-sm"
            style={{
              borderColor: 'var(--border)',
              background: 'rgba(var(--bg-card-rgb), 0.84)',
              color: 'var(--text-dim)',
            }}
          >
            Kapat
          </button>

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
            <div
              className="guide-card-media h-24 w-24 shrink-0 rounded-[1.5rem] border p-3.5"
              style={{
                borderColor: 'rgba(var(--gold-rgb), 0.24)',
                background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.92), rgba(var(--bg-rgb), 0.96))',
              }}
            >
              <div className="guide-card-halo" aria-hidden />
              <img
                src={itemIconUrl(item.img)}
                alt={item.name}
                className="guide-card-portrait h-full w-full object-contain"
              />
              <div className="guide-card-ring" aria-hidden />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <span className="section-label" style={{ color: 'var(--gold)' }}>
                    Eşya Bilgisi
                  </span>
                  <h2 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-[2rem]" style={{ color: 'var(--gold-bright)' }}>
                    {item.name}
                  </h2>
                  {showSummary && (
                    <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: 'var(--text-dim)' }}>
                      {summary}
                    </p>
                  )}
                </div>

                <span
                  className="inline-flex items-center rounded-full border px-3.5 py-2 text-sm font-bold tabular-nums"
                  style={{
                    borderColor: 'rgba(var(--gold-rgb), 0.34)',
                    background: 'linear-gradient(180deg, rgba(var(--gold-rgb), 0.2), rgba(var(--gold-rgb), 0.1))',
                    color: 'var(--gold-bright)',
                    boxShadow: '0 0 24px -12px rgba(var(--gold-glow-rgb), 0.72)',
                  }}
                >
                  {item.gold} altın
                </span>
              </div>

              {item.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                      style={{
                        borderColor: 'rgba(var(--gold-rgb), 0.22)',
                        background: 'rgba(var(--bg-rgb), 0.38)',
                        color: 'var(--text)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-y-auto p-5 sm:p-6">
          <div className="flex flex-col gap-5">
            {description && (
              <section
                className="hextech-frame rounded-[1.65rem] border p-4 sm:p-5"
                style={{
                  background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.88), rgba(var(--bg-rgb), 0.94))',
                  borderColor: 'rgba(var(--gold-rgb), 0.18)',
                }}
              >
                <div className="section-label hextech-divider" style={{ color: 'var(--gold)' }}>
                  <span>Açıklama</span>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm leading-7" style={{ color: 'var(--text)' }}>
                  {description}
                </p>
              </section>
            )}

            {components.length > 0 && (
              <section
                className="hextech-frame rounded-[1.65rem] border p-4 sm:p-5"
                style={{
                  background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.88), rgba(var(--bg-rgb), 0.94))',
                  borderColor: 'rgba(var(--gold-rgb), 0.18)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="section-label hextech-divider min-w-0 flex-1" style={{ color: 'var(--gold)' }}>
                    <span>Bileşenler</span>
                  </div>

                  {componentGoldTotal > 0 && (
                    <span
                      className="rounded-full border px-3 py-1.5 text-xs font-bold tabular-nums"
                      style={{
                        borderColor: 'rgba(var(--gold-rgb), 0.3)',
                        background: 'rgba(var(--gold-rgb), 0.08)',
                        color: 'var(--gold-bright)',
                      }}
                    >
                      Toplam {componentGoldTotal} altın
                    </span>
                  )}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {components.map((entry, index) => (
                    <RelatedCard key={`${entry.id}-${index}`} entry={entry} />
                  ))}
                </div>
              </section>
            )}

            {upgrades.length > 0 && (
              <section
                className="hextech-frame rounded-[1.65rem] border p-4 sm:p-5"
                style={{
                  background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.88), rgba(var(--bg-rgb), 0.94))',
                  borderColor: 'rgba(var(--gold-rgb), 0.18)',
                }}
              >
                <div className="section-label hextech-divider" style={{ color: 'var(--gold)' }}>
                  <span>Şunlara yükseltilir</span>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {upgrades.map((upgrade) => (
                    <RelatedCard
                      key={upgrade.id}
                      entry={{
                        id: upgrade.id,
                        name: upgrade.name,
                        img: upgrade.img,
                        gold: upgrade.gold,
                        item: upgrade,
                      }}
                      actionLabel={onSelect ? 'Geçiş' : undefined}
                      onClick={onSelect ? () => onSelect(upgrade) : undefined}
                    />
                  ))}
                </div>
              </section>
            )}

            {!hasExtraSections && (
              <section
                className="rounded-[1.5rem] border px-4 py-4 text-sm"
                style={{
                  borderColor: 'rgba(var(--gold-rgb), 0.18)',
                  background: 'rgba(var(--bg-rgb), 0.3)',
                  color: 'var(--text-dim)',
                }}
              >
                Bu eşya için ek rehber verisi bulunamadı.
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
