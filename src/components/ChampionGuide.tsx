import { useMemo, useState } from 'react'
import { CHAMPIONS, squareUrl } from '../game/data'
import { filterGuideChampions } from '../game/championGuide'
import {
  ALL_FILTER,
  laneOptions,
  regionOptions,
  roleOptions,
  toggleValue,
  type FilterKind,
  type PoolFilter,
} from '../game/filter'
import type { Champion } from '../game/types'
import ChampionInfo from './ChampionInfo'
import GuideTabs, { type GuideKey } from './GuideTabs'

interface Props {
  onExit: () => void
  onNavigate?: (key: GuideKey) => void
}

const REGION_OPTIONS = regionOptions()
const ROLE_OPTIONS = roleOptions()
const LANE_OPTIONS = laneOptions()
const YEAR_OPTIONS = Array.from(
  new Set(CHAMPIONS.map((champion) => champion.year).filter((year): year is number => year != null)),
).sort((a, b) => b - a)
const FILTER_GROUPS: { title: string; kind: FilterKind; options: string[] }[] = [
  { title: 'Bölge', kind: 'region', options: REGION_OPTIONS },
  { title: 'Rol', kind: 'role', options: ROLE_OPTIONS },
  { title: 'Koridor', kind: 'lane', options: LANE_OPTIONS },
]

function hasActiveFilter(filter: PoolFilter, years: number[]): boolean {
  return filter.regions.length > 0 || filter.roles.length > 0 || filter.lanes.length > 0 || years.length > 0
}

function countPickedFilters(filter: PoolFilter, years: number[]): number {
  return filter.regions.length + filter.roles.length + filter.lanes.length + years.length
}

function pickedValues(filter: PoolFilter, kind: FilterKind): string[] {
  if (kind === 'region') return filter.regions
  if (kind === 'role') return filter.roles
  return filter.lanes
}

function toggleYear(years: number[], year: number): number[] {
  return years.includes(year) ? years.filter((value) => value !== year) : [...years, year]
}

function FilterGroup({
  title,
  kind,
  options,
  value,
  onChange,
}: {
  title: string
  kind: FilterKind
  options: string[]
  value: PoolFilter
  onChange: (next: PoolFilter) => void
}) {
  const picked = pickedValues(value, kind)

  return (
    <div
      className="hextech-frame rounded-2xl border px-3 py-3 sm:px-3.5"
      style={{
        background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.82), rgba(var(--bg-rgb), 0.9))',
        borderColor: picked.length > 0 ? 'rgba(var(--gold-rgb), 0.3)' : 'rgba(var(--gold-rgb), 0.14)',
      }}
    >
      <div className="section-label mb-2.5 flex items-center justify-between gap-2">
        <span>{title}</span>
        {picked.length > 0 && (
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
            style={{
              borderColor: 'rgba(var(--gold-rgb), 0.38)',
              background: 'rgba(var(--gold-rgb), 0.12)',
              color: 'var(--gold)',
            }}
          >
            {picked.length} seçili
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = picked.includes(option)

          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(toggleValue(value, kind, option))}
              aria-pressed={active}
              className="guide-chip rounded-full border px-3 py-1.5 text-xs font-semibold sm:text-[13px]"
              style={{
                borderColor: active ? 'var(--gold)' : 'var(--border)',
                background: active ? 'var(--gold-soft)' : 'rgba(var(--bg-rgb), 0.42)',
                color: active ? 'var(--gold-bright)' : 'var(--text)',
              }}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function YearFilterGroup({
  years,
  onChange,
}: {
  years: number[]
  onChange: (next: number[]) => void
}) {
  return (
    <div
      className="hextech-frame rounded-2xl border px-3 py-3 sm:px-3.5"
      style={{
        background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.82), rgba(var(--bg-rgb), 0.9))',
        borderColor: years.length > 0 ? 'rgba(var(--gold-rgb), 0.3)' : 'rgba(var(--gold-rgb), 0.14)',
      }}
    >
      <div className="section-label mb-2.5 flex items-center justify-between gap-2">
        <span>Yıl</span>
        {years.length > 0 && (
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
            style={{
              borderColor: 'rgba(var(--gold-rgb), 0.38)',
              background: 'rgba(var(--gold-rgb), 0.12)',
              color: 'var(--gold)',
            }}
          >
            {years.length} seçili
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {YEAR_OPTIONS.map((year) => {
          const active = years.includes(year)

          return (
            <button
              key={year}
              type="button"
              onClick={() => onChange(toggleYear(years, year))}
              aria-pressed={active}
              className="guide-chip rounded-full border px-3 py-1.5 text-xs font-semibold sm:text-[13px]"
              style={{
                borderColor: active ? 'var(--gold)' : 'var(--border)',
                background: active ? 'var(--gold-soft)' : 'rgba(var(--bg-rgb), 0.42)',
                color: active ? 'var(--gold-bright)' : 'var(--text)',
              }}
            >
              {String(year)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function ChampionGuide({ onExit, onNavigate }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<PoolFilter>(ALL_FILTER)
  const [years, setYears] = useState<number[]>([])
  const [selected, setSelected] = useState<Champion | null>(null)

  const shownChampions = useMemo(
    () => filterGuideChampions(CHAMPIONS, search, filter, years),
    [search, filter, years],
  )

  const activeFilter = hasActiveFilter(filter, years)
  const activeFilterCount = countPickedFilters(filter, years)
  const hasQuery = search.trim().length > 0

  function clearAll() {
    setSearch('')
    setFilter(ALL_FILTER)
    setYears([])
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -left-16 top-10 h-44 w-44 rounded-full blur-3xl sm:h-56 sm:w-56"
          style={{ background: 'rgba(var(--gold-glow-rgb), 0.12)' }}
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
                <GuideTabs active="champions" onSelect={onNavigate} />
              </div>
            )}

          </div>

          <div className="mt-4 sm:mt-5">
            <h1
              className="text-shimmer font-display text-[1.95rem] font-extrabold tracking-tight sm:text-[2.6rem]"
              style={{ filter: 'drop-shadow(0 0 18px rgba(var(--gold-glow-rgb), 0.28))' }}
            >
              📖 Şampiyon Rehberi
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
              Vadi&apos;deki tüm şampiyonları bölge, rol, koridor ve çıkış yılına göre keşfet; karta tıklayınca bilgi paneli açılır.
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
                  Arama ve filtreleri birleştirerek şampiyon havuzunu daralt.
                </p>
              </div>

              {(hasQuery || activeFilter) && (
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
                <label htmlFor="champion-guide-search" className="section-label mb-2 block">
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
                      id="champion-guide-search"
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Örn: Kai'Sa, Jinx, Lee"
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

              <div className="grid gap-3 xl:grid-cols-4">
                {FILTER_GROUPS.map((group) => (
                  <FilterGroup
                    key={group.kind}
                    title={group.title}
                    kind={group.kind}
                    options={group.options}
                    value={filter}
                    onChange={setFilter}
                  />
                ))}
                <YearFilterGroup years={years} onChange={setYears} />
              </div>
            </div>
          </div>
        </section>

        {shownChampions.length === 0 ? (
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
                Arama ve filtre birleşiminde eşleşen bir şampiyon yok. Terimi değiştir ya da filtreleri temizle.
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
                <span>Şampiyon Seçimi</span>
              </div>
              <span className="hidden text-xs font-medium sm:inline" style={{ color: 'var(--text-dim)' }}>
                Kartı açmak için portreye tıkla
              </span>
            </div>

            <div className="stagger grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {shownChampions.map((champion) => {
                const primaryRole = champion.roles[0]
                const meta = primaryRole ? `${champion.region} · ${primaryRole}` : champion.region

                return (
                  <button
                    key={champion.id}
                    type="button"
                    onClick={() => setSelected(champion)}
                    className="guide-card card-btn flex min-w-0 flex-col gap-2.5 rounded-2xl border p-2.5 text-left"
                    style={{
                      background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.92), rgba(var(--bg-rgb), 0.96))',
                      borderColor: 'rgba(var(--gold-rgb), 0.15)',
                    }}
                    aria-label={`${champion.name} bilgi kartını aç`}
                  >
                    <div
                      className="guide-card-media rounded-[1.05rem] border"
                      style={{ borderColor: 'rgba(var(--gold-rgb), 0.22)' }}
                    >
                      <div className="guide-card-halo" aria-hidden />
                      <img
                        src={squareUrl(champion.id)}
                        alt={champion.name}
                        loading="lazy"
                        className="guide-card-portrait aspect-square w-full object-cover"
                      />
                      <div className="guide-card-ring" aria-hidden />
                    </div>

                    <div className="min-w-0">
                      <span className="block truncate text-sm font-semibold sm:text-[15px]" style={{ color: 'var(--text)' }}>
                        {champion.name}
                      </span>
                      <span
                        className="guide-card-meta mt-1 block truncate text-[11px] font-medium"
                        style={{ color: 'var(--text-dim)' }}
                      >
                        {meta}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {selected && (
        <ChampionInfo
          champion={selected}
          splashNum={0}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
