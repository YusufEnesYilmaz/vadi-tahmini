import { useState } from 'react'
import {
  ALL_FILTER, filterKey, filterLabel, laneOptions, poolCount,
  regionOptions, roleOptions, type PoolFilter,
} from '../game/filter'

interface Props {
  value: PoolFilter
  onChange: (f: PoolFilter) => void
}

/** Bir filtre grubu (Bölge / Rol / Koridor) — seçenekler veriden gelir */
function Group({
  title, kind, options, value, onChange,
}: {
  title: string
  kind: 'region' | 'role' | 'lane'
  options: string[]
  value: PoolFilter
  onChange: (f: PoolFilter) => void
}) {
  return (
    <div className="mt-3 first:mt-0">
      <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
        {title}
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const f: PoolFilter = { kind, value: o }
          const active = filterKey(value) === filterKey(f)
          const n = poolCount(f)
          return (
            <button key={o} onClick={() => onChange(active ? ALL_FILTER : f)}
              className="card-btn rounded-md border px-2.5 py-1 text-xs font-semibold"
              style={{
                borderColor: active ? 'var(--gold)' : 'var(--border)',
                background: active ? 'var(--gold)' : 'transparent',
                color: active ? 'var(--on-gold)' : 'var(--text)',
              }}>
              {o} <span style={{ opacity: 0.7 }}>{n}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Havuz filtresi seçici — Sınırsız/Zamana Karşı menüsünde.
 * Kapalıyken tek satır özet, açılınca gruplar. Her seçeneğin yanında kaç
 * şampiyon kaldığı yazar ki oyuncu havuzu daralttığını görsün.
 */
export default function PoolFilterPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const isAll = value.kind === 'all'

  return (
    <div>
      <div className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2"
        style={{ borderColor: isAll ? 'var(--border)' : 'var(--gold)', background: 'var(--bg-card)' }}>
        <span className="min-w-0 truncate text-sm">
          <span style={{ color: 'var(--text-dim)' }}>Havuz: </span>
          <b style={{ color: isAll ? 'var(--text)' : 'var(--gold)' }}>{filterLabel(value)}</b>
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}> · {poolCount(value)} şampiyon</span>
        </span>
        <div className="flex shrink-0 gap-2">
          {!isAll && (
            <button onClick={() => onChange(ALL_FILTER)} className="text-xs underline underline-offset-2"
              style={{ color: 'var(--text-dim)' }}>
              sıfırla
            </button>
          )}
          <button onClick={() => setOpen((v) => !v)} className="text-xs underline underline-offset-2"
            style={{ color: 'var(--gold)' }}>
            {open ? 'gizle' : 'değiştir'}
          </button>
        </div>
      </div>

      {open && (
        <div className="anim-pop mt-2 rounded-xl border p-3"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <Group title="Bölge" kind="region" options={regionOptions()} value={value} onChange={onChange} />
          <Group title="Rol" kind="role" options={roleOptions()} value={value} onChange={onChange} />
          <Group title="Koridor" kind="lane" options={laneOptions()} value={value} onChange={onChange} />
          <p className="mt-3 text-xs" style={{ color: 'var(--text-dim)' }}>
            Tek seçim yapılır; seçiliye tekrar dokunmak filtreyi kaldırır.
            Günlük modda filtre yoktur — herkes aynı bulmacayı çözer.
            İstatistikler filtreye göre ayrılmaz.
          </p>
        </div>
      )}
    </div>
  )
}
