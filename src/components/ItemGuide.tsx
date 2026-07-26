import { useMemo, useState } from 'react'
import { ITEMS, itemIconUrl } from '../game/data'
import {
  ITEM_PRICE_BANDS,
  filterGuideItems,
  itemTagOptions,
  type ItemPriceBandId,
} from '../game/itemGuide'
import type { Item } from '../game/types'
import ItemInfo from './ItemInfo'
import GuideTabs, { type GuideKey } from './GuideTabs'

interface Props {
  onExit: () => void
  onNavigate?: (key: GuideKey) => void
}

const TAG_OPTIONS = itemTagOptions(ITEMS)
const TOTAL_ITEMS = ITEMS.length

function toggleTag(tags: string[], tag: string): string[] {
  return tags.includes(tag) ? tags.filter((value) => value !== tag) : [...tags, tag]
}

function TagFilterGroup({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div
      className="hextech-frame rounded-2xl border px-3 py-3 sm:px-3.5"
      style={{
        background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.82), rgba(var(--bg-rgb), 0.9))',
        borderColor: tags.length > 0 ? 'rgba(var(--gold-rgb), 0.3)' : 'rgba(var(--gold-rgb), 0.14)',
      }}
    >
      <div className="section-label mb-2.5 flex items-center justify-between gap-2">
        <span>Etiket</span>
        {tags.length > 0 && (
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
            style={{
              borderColor: 'rgba(var(--gold-rgb), 0.38)',
              background: 'rgba(var(--gold-rgb), 0.12)',
              color: 'var(--gold)',
            }}
          >
            {tags.length} seçili
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {TAG_OPTIONS.map((tag) => {
          const active = tags.includes(tag)

          return (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(toggleTag(tags, tag))}
              aria-pressed={active}
              className="guide-chip rounded-full border px-3 py-1.5 text-xs font-semibold sm:text-[13px]"
              style={{
                borderColor: active ? 'var(--gold)' : 'var(--border)',
                background: active ? 'var(--gold-soft)' : 'rgba(var(--bg-rgb), 0.42)',
                color: active ? 'var(--gold-bright)' : 'var(--text)',
              }}
            >
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PriceFilterGroup({
  band,
  onChange,
}: {
  band: ItemPriceBandId | null
  onChange: (next: ItemPriceBandId | null) => void
}) {
  return (
    <div
      className="hextech-frame rounded-2xl border px-3 py-3 sm:px-3.5"
      style={{
        background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.82), rgba(var(--bg-rgb), 0.9))',
        borderColor: band ? 'rgba(var(--gold-rgb), 0.3)' : 'rgba(var(--gold-rgb), 0.14)',
      }}
    >
      <div className="section-label mb-2.5 flex items-center justify-between gap-2">
        <span>Fiyat Bandı</span>
        {band && (
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
            style={{
              borderColor: 'rgba(var(--gold-rgb), 0.38)',
              background: 'rgba(var(--gold-rgb), 0.12)',
              color: 'var(--gold)',
            }}
          >
            1 seçili
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {ITEM_PRICE_BANDS.map((priceBand) => {
          const active = band === priceBand.id

          return (
            <button
              key={priceBand.id}
              type="button"
              onClick={() => onChange(active ? null : priceBand.id)}
              aria-pressed={active}
              className="guide-chip rounded-full border px-3 py-1.5 text-xs font-semibold sm:text-[13px]"
              style={{
                borderColor: active ? 'var(--gold)' : 'var(--border)',
                background: active ? 'var(--gold-soft)' : 'rgba(var(--bg-rgb), 0.42)',
                color: active ? 'var(--gold-bright)' : 'var(--text)',
              }}
            >
              {priceBand.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function ItemGuide({ onExit, onNavigate }: Props) {
  const [search, setSearch] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [band, setBand] = useState<ItemPriceBandId | null>(null)
  const [selected, setSelected] = useState<Item | null>(null)

  const shownItems = useMemo(
    () => filterGuideItems(ITEMS, search, tags, band),
    [search, tags, band],
  )

  const hasQuery = search.trim().length > 0
  const activeFilterCount = tags.length + (band ? 1 : 0)

  function clearAll() {
    setSearch('')
    setTags([])
    setBand(null)
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -left-16 top-10 h-44 w-44 rounded-full blur-3xl sm:h-56 sm:w-56"
          style={{ background: 'rgba(var(--hextech-rgb), 0.12)' }}
        />
        <div
          className="absolute right-[-4rem] top-16 h-52 w-52 rounded-full blur-3xl sm:h-64 sm:w-64"
          style={{ background: 'rgba(var(--gold-rgb), 0.1)' }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-3 py-3 sm:gap-5 sm:px-4 sm:py-4">
        <section
          className="panel rounded-[1.75rem] border px-4 py-4 sm:px-5 sm:py-5"
          style={{
            background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.9), rgba(var(--bg-rgb), 0.94))',
            borderColor: 'rgba(var(--gold-rgb), 0.26)',
          }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onExit}
              className="card-btn rounded-full border px-4 py-2 text-sm font-semibold"
              style={{
                borderColor: 'rgba(var(--gold-rgb), 0.18)',
                background: 'rgba(var(--bg-rgb), 0.52)',
                color: 'var(--text-dim)',
              }}
            >
              ← Menü
            </button>

            {onNavigate && (
              <div className="order-3 w-full min-w-0 sm:order-none sm:max-w-md sm:flex-1">
                <GuideTabs active="items" onSelect={onNavigate} />
              </div>
            )}

            <span
              className="ml-auto inline-flex min-w-[7rem] items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold tabular-nums sm:min-w-[7.75rem]"
              style={{
                borderColor: 'rgba(var(--gold-rgb), 0.34)',
                background: 'linear-gradient(180deg, rgba(var(--gold-rgb), 0.2), rgba(var(--gold-rgb), 0.1))',
                color: 'var(--gold-bright)',
                boxShadow: '0 0 24px -10px rgba(var(--gold-glow-rgb), 0.6)',
              }}
            >
              <span className="section-label text-[10px]" style={{ color: 'var(--gold)' }}>
                Gösterilen
              </span>
              <span>{shownItems.length}/{TOTAL_ITEMS}</span>
            </span>
          </div>

          <div className="mt-4 sm:mt-5">
            <h1
              className="text-shimmer font-display text-[1.95rem] font-extrabold tracking-tight sm:text-[2.6rem]"
              style={{ filter: 'drop-shadow(0 0 18px rgba(var(--gold-glow-rgb), 0.28))' }}
            >
              🗡 Eşya Rehberi
            </h1>

            <div className="mt-3 flex items-center gap-3" aria-hidden>
              <span
                className="h-px flex-1"
                style={{ background: 'linear-gradient(90deg, rgba(var(--gold-rgb), 0.55), transparent)' }}
              />
              <span style={{ color: 'var(--gold)' }}>◈</span>
              <span
                className="h-px w-12 sm:w-20"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(var(--gold-rgb), 0.55))' }}
              />
            </div>

            <p className="mt-3 max-w-3xl text-sm leading-6 sm:text-base" style={{ color: 'var(--text-dim)' }}>
              Summoner&apos;s Rift&apos;teki tam eşyaları arayıp filtrele; karta tıklayınca açıklama, bileşenler ve yükseltmeler tek panelde açılır.
            </p>
          </div>
        </section>

        <section
          className="panel rounded-[1.65rem] border px-3.5 py-3.5 sm:px-4 sm:py-4"
          style={{
            background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.9), rgba(var(--bg-rgb), 0.94))',
            borderColor: 'rgba(var(--gold-rgb), 0.2)',
          }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="section-label hextech-divider mb-2" style={{ color: 'var(--gold)' }}>
                  <span>Keşif Filtresi</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                  Ad, stat etiketi ve altın bandını birleştirerek rehber havuzunu daralt.
                </p>
              </div>

              {(hasQuery || activeFilterCount > 0) && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="card-btn self-start rounded-full border px-4 py-2 text-sm font-semibold xl:self-auto"
                  style={{
                    borderColor: 'rgba(var(--gold-rgb), 0.38)',
                    background: 'rgba(var(--gold-rgb), 0.08)',
                    color: 'var(--gold)',
                  }}
                >
                  Temizle
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label htmlFor="item-guide-search" className="section-label mb-2 block">
                  Ada göre ara
                </label>

                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <div
                    className="guide-search-shell flex min-w-0 flex-1 items-center gap-3 rounded-2xl border px-3.5 py-3"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <span className="text-base" style={{ color: 'var(--gold)' }} aria-hidden>
                      🔍
                    </span>
                    <input
                      id="item-guide-search"
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Örn: Zhonya, Aklın Sonu, Üçlü Kuvvet"
                      autoComplete="off"
                      className="guide-search-input min-w-0 flex-1 text-sm"
                      style={{ color: 'var(--text)' }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {activeFilterCount > 0 && (
                      <span
                        className="rounded-full border px-3 py-1.5 text-xs font-bold"
                        style={{
                          borderColor: 'rgba(var(--gold-rgb), 0.3)',
                          background: 'rgba(var(--gold-rgb), 0.08)',
                          color: 'var(--gold-bright)',
                        }}
                      >
                        {activeFilterCount} filtre aktif
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                <TagFilterGroup tags={tags} onChange={setTags} />
                <PriceFilterGroup band={band} onChange={setBand} />
              </div>
            </div>
          </div>
        </section>

        {shownItems.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-4">
            <div
              className="panel w-full max-w-xl rounded-[2rem] border px-6 py-7 text-center sm:px-8"
              style={{
                background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.92), rgba(var(--bg-rgb), 0.96))',
                borderColor: 'rgba(var(--gold-rgb), 0.24)',
              }}
            >
              <div
                className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border text-2xl"
                style={{
                  borderColor: 'rgba(var(--gold-rgb), 0.28)',
                  background: 'rgba(var(--gold-rgb), 0.08)',
                  color: 'var(--gold)',
                }}
              >
                🔎
              </div>
              <h2 className="mt-4 font-display text-2xl font-bold" style={{ color: 'var(--gold-bright)' }}>
                Sonuç bulunamadı
              </h2>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-dim)' }}>
                Bu arama ve filtre birleşiminde eşleşen bir eşya yok. Terimi değiştir ya da filtreleri temizle.
              </p>
              <div className="mx-auto mt-4 flex max-w-[14rem] items-center gap-3" aria-hidden>
                <span
                  className="h-px flex-1"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(var(--gold-rgb), 0.42))' }}
                />
                <span style={{ color: 'var(--gold)' }}>◆</span>
                <span
                  className="h-px flex-1"
                  style={{ background: 'linear-gradient(90deg, rgba(var(--gold-rgb), 0.42), transparent)' }}
                />
              </div>
              <button
                type="button"
                onClick={clearAll}
                className="btn-gold mt-5 rounded-xl px-5 py-2.5 text-sm font-bold"
              >
                {hasQuery ? 'Aramayı ve filtreleri temizle' : 'Filtreleri temizle'}
              </button>
            </div>
          </div>
        ) : (
          <section className="flex flex-1 flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="section-label hextech-divider min-w-0 flex-1" style={{ color: 'var(--gold)' }}>
                <span>Eşya Seçimi</span>
              </div>
              <span className="hidden text-xs font-medium sm:inline" style={{ color: 'var(--text-dim)' }}>
                Kartı açmak için ikona tıkla
              </span>
            </div>

            <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {shownItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className="guide-card card-btn flex min-w-0 flex-col gap-3 rounded-2xl border p-3 text-left"
                  style={{
                    background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.92), rgba(var(--bg-rgb), 0.96))',
                    borderColor: 'rgba(var(--gold-rgb), 0.15)',
                  }}
                  aria-label={`${item.name} bilgi kartını aç`}
                >
                  <div
                    className="guide-card-media rounded-[1.15rem] border p-3"
                    style={{ borderColor: 'rgba(var(--gold-rgb), 0.22)' }}
                  >
                    <div className="guide-card-halo" aria-hidden />
                    <img
                      src={itemIconUrl(item.img)}
                      alt={item.name}
                      loading="lazy"
                      className="guide-card-portrait aspect-square w-full object-contain"
                    />
                    <div className="guide-card-ring" aria-hidden />
                  </div>

                  <div className="min-w-0">
                    <span className="block truncate text-sm font-semibold sm:text-[15px]" style={{ color: 'var(--text)' }}>
                      {item.name}
                    </span>

                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className="rounded-full border px-2.5 py-1 text-[11px] font-bold tabular-nums"
                        style={{
                          borderColor: 'rgba(var(--gold-rgb), 0.3)',
                          background: 'rgba(var(--gold-rgb), 0.08)',
                          color: 'var(--gold-bright)',
                        }}
                      >
                        {item.gold} altın
                      </span>
                    </div>

                    {item.plain && (
                      <span
                        className="guide-card-meta mt-2 block line-clamp-2 text-[11px] font-medium leading-5"
                        style={{ color: 'var(--text-dim)' }}
                      >
                        {item.plain}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {selected && (
        <ItemInfo
          item={selected}
          onClose={() => setSelected(null)}
          onSelect={setSelected}
        />
      )}
    </div>
  )
}
