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

const REGION_OPTIONS = regionOptions()
const ROLE_OPTIONS = roleOptions()
const LANE_OPTIONS = laneOptions()
const TOTAL_CHAMPIONS = CHAMPIONS.length

function hasActiveFilter(filter: PoolFilter): boolean {
  return filter.regions.length > 0 || filter.roles.length > 0 || filter.lanes.length > 0
}

function pickedValues(filter: PoolFilter, kind: FilterKind): string[] {
  if (kind === 'region') return filter.regions
  if (kind === 'role') return filter.roles
  return filter.lanes
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
    <div>
      <div className="section-label mb-1.5 flex items-center gap-2">
        <span>{title}</span>
        {picked.length > 0 && (
          <span style={{ color: 'var(--gold)' }}>{picked.length} seçili</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = picked.includes(option)
          return (
            <button
              key={option}
              onClick={() => onChange(toggleValue(value, kind, option))}
              className="card-btn rounded-md border px-2.5 py-1 text-xs font-semibold"
              style={{
                borderColor: active ? 'var(--gold)' : 'var(--border)',
                background: active ? 'var(--gold-soft)' : 'transparent',
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

export default function ChampionGuide({ onExit }: { onExit: () => void }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<PoolFilter>(ALL_FILTER)
  const [selected, setSelected] = useState<Champion | null>(null)

  const shownChampions = useMemo(
    () => filterGuideChampions(CHAMPIONS, search, filter),
    [search, filter],
  )

  const activeFilter = hasActiveFilter(filter)
  const hasQuery = search.trim().length > 0
  const clearAll = () => {
    setSearch('')
    setFilter(ALL_FILTER)
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 py-3 sm:gap-5 sm:px-4 sm:py-4">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b pb-3"
          style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={onExit}
            className="card-btn rounded-xl border px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          >
            ← Menü
          </button>
          <h1 className="min-w-0 truncate text-center font-display text-lg font-bold sm:text-2xl"
            style={{ color: 'var(--gold-bright)' }}>
            📖 Şampiyon Rehberi
          </h1>
          <span className="min-w-[4.75rem] text-right text-sm font-semibold tabular-nums sm:text-base"
            style={{ color: 'var(--gold)' }}>
            {shownChampions.length}/{TOTAL_CHAMPIONS}
          </span>
        </div>

        <div className="rounded-2xl border p-3 sm:p-4 panel"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex flex-col gap-3">
            <div>
              <label htmlFor="champion-guide-search" className="section-label mb-1.5 block">
                Ada göre ara
              </label>
              <div className="flex gap-2">
                <input
                  id="champion-guide-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Örn: Kai'Sa, Jinx, Lee"
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
                {(hasQuery || activeFilter) && (
                  <button
                    onClick={clearAll}
                    className="card-btn rounded-xl border px-3 py-2 text-sm font-semibold"
                    style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}
                  >
                    Temizle
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <FilterGroup title="Bölge" kind="region" options={REGION_OPTIONS} value={filter} onChange={setFilter} />
              <FilterGroup title="Rol" kind="role" options={ROLE_OPTIONS} value={filter} onChange={setFilter} />
              <FilterGroup title="Koridor" kind="lane" options={LANE_OPTIONS} value={filter} onChange={setFilter} />
            </div>
          </div>
        </div>

        {shownChampions.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-lg rounded-2xl border p-6 text-center panel"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <h2 className="font-display text-xl font-bold" style={{ color: 'var(--gold-bright)' }}>
                Sonuç bulunamadı
              </h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-dim)' }}>
                Arama ve filtre birleşiminde eşleşen bir şampiyon yok. Terimi değiştir ya da filtreleri temizle.
              </p>
              <button
                onClick={clearAll}
                className="btn-gold mt-4 rounded-xl px-5 py-2.5 text-sm font-bold"
              >
                {hasQuery ? 'Aramayı ve filtreleri temizle' : 'Filtreleri temizle'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {shownChampions.map((champion) => (
              <button
                key={champion.id}
                onClick={() => setSelected(champion)}
                className="card-btn flex min-w-0 flex-col gap-2 rounded-xl border p-2 text-left"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                aria-label={`${champion.name} bilgi kartını aç`}
              >
                <img
                  src={squareUrl(champion.id)}
                  alt={champion.name}
                  loading="lazy"
                  className="aspect-square w-full rounded-lg object-cover"
                />
                <span className="truncate text-xs font-semibold sm:text-sm"
                  style={{ color: 'var(--text)' }}>
                  {champion.name}
                </span>
              </button>
            ))}
          </div>
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
