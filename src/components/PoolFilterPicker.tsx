import { useState } from 'react'
import {
  ALL_FILTER, countWith, filterLabel, isAllFilter, laneOptions, poolCount,
  regionOptions, roleOptions, selected, toggleValue,
  type FilterKind, type PoolFilter,
} from '../game/filter'

interface Props {
  value: PoolFilter
  onChange: (f: PoolFilter) => void
}

/** Bir filtre grubu (Bölge / Rol / Koridor) — seçenekler veriden gelir, çoklu seçim */
function Group({
  title, kind, options, value, onChange,
}: {
  title: string
  kind: FilterKind
  options: string[]
  value: PoolFilter
  onChange: (f: PoolFilter) => void
}) {
  const picked = selected(value, kind)
  return (
    <div className="pool-filter-group rounded-2xl border p-3">
      <div className="mb-2 flex items-center gap-2">
        <h4 className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--hextech)' }}>
          {title}
        </h4>
        {picked.length > 0 && (
          <span className="pool-filter-picked text-[11px] font-semibold" style={{ color: 'var(--gold)' }}>{picked.length} seçili</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = picked.includes(o)
          // Sayı: bu seçeneğe dokunursam havuz kaç olur (diğer gruplar hesaba katılır)
          const n = countWith(value, kind, o)
          return (
            <button
              key={o}
              onClick={() => onChange(toggleValue(value, kind, o))}
              aria-pressed={active}
              className={`pool-filter-chip card-btn rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? 'is-active' : ''}`}
            >
              {active && '✓ '}{o} <span className="pool-filter-chip-count">{n}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Havuz filtresi seçici — Sınırsız/Zamana Karşı menüsünde.
 * Kapalıyken tek satır özet, açılınca gruplar. Her seçeneğin yanındaki sayı,
 * o seçeneğe dokunulursa havuzun kaça ineceğini gösterir.
 */
export default function PoolFilterPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const isAll = isAllFilter(value)
  const count = poolCount(value)

  return (
    <div className="menu-subpanel pool-filter-shell rounded-[22px] border p-3 sm:p-4">
      <div className="pool-filter-summary flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-display text-lg font-bold" style={{ color: 'var(--gold-bright)' }}>Havuz Filtresi</span>
            <span className={`pool-filter-count rounded-full border px-2.5 py-1 text-[11px] font-semibold ${count === 0 && !isAll ? 'is-empty' : ''}`}>
              {count} şampiyon
            </span>
          </div>
          <p className="mt-1 text-sm">
            <span style={{ color: 'var(--text-dim)' }}>Seçim: </span>
            <b style={{ color: isAll ? 'var(--text)' : 'var(--gold-bright)' }}>{filterLabel(value)}</b>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {!isAll && (
            <button
              onClick={() => onChange(ALL_FILTER)}
              className="pool-filter-summary-btn rounded-full border px-3 py-1 text-xs font-semibold"
            >
              Sıfırla
            </button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="pool-filter-summary-btn pool-filter-toggle rounded-full border px-3 py-1 text-xs font-semibold"
          >
            {open ? 'Filtreyi Gizle' : 'Filtreyi Aç'}
          </button>
        </div>
      </div>

      {open && (
        <div className="pool-filter-panel anim-pop mt-3 rounded-[20px] border p-3 sm:p-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <Group title="Bölge" kind="region" options={regionOptions()} value={value} onChange={onChange} />
            <Group title="Rol" kind="role" options={roleOptions()} value={value} onChange={onChange} />
            <Group title="Koridor" kind="lane" options={laneOptions()} value={value} onChange={onChange} />
          </div>

          {count === 0 && !isAll && (
            <p className="pool-filter-warning mt-3 rounded-2xl border px-3 py-2 text-xs">
              Bu kombinasyona uyan şampiyon yok. Oyun filtreyi yok sayıp tüm havuzdan soracak.
            </p>
          )}

          <p className="pool-filter-help mt-3 text-xs" style={{ color: 'var(--text-dim)' }}>
            Çoklu seçim yapabilirsin: aynı grupta birden fazla seçenek <b>veya</b> demektir
            (Noxus + Ionia = ikisinden biri), farklı gruplar <b>ve</b> ile birleşir
            (Noxus + Büyücü = Noxus'lu büyücüler). Seçiliye tekrar dokunmak kaldırır.
            Günlük modda filtre yoktur; herkes aynı bulmacayı çözer. İstatistikler filtreye göre ayrılmaz.
          </p>
        </div>
      )}
    </div>
  )
}
