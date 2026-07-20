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
    <div className="mt-3 first:mt-0">
      <div className="mb-1.5 flex items-center gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
          {title}
        </h4>
        {picked.length > 0 && (
          <span className="text-xs" style={{ color: 'var(--gold)' }}>{picked.length} seçili</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = picked.includes(o)
          // Sayı: bu seçeneğe dokunursam havuz kaç olur (diğer gruplar hesaba katılır)
          const n = countWith(value, kind, o)
          return (
            <button key={o} onClick={() => onChange(toggleValue(value, kind, o))}
              className="card-btn rounded-md border px-2.5 py-1 text-xs font-semibold"
              style={{
                borderColor: active ? 'var(--gold)' : 'var(--border)',
                background: active ? 'var(--gold)' : 'transparent',
                color: active ? 'var(--on-gold)' : 'var(--text)',
              }}>
              {active && '✓ '}{o} <span style={{ opacity: 0.7 }}>{n}</span>
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
    <div>
      <div className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2"
        style={{ borderColor: isAll ? 'var(--border)' : 'var(--gold)', background: 'var(--bg-card)' }}>
        <span className="min-w-0 truncate text-sm">
          <span style={{ color: 'var(--text-dim)' }}>Havuz: </span>
          <b style={{ color: isAll ? 'var(--text)' : 'var(--gold)' }}>{filterLabel(value)}</b>
          <span className="text-xs" style={{ color: count === 0 ? 'var(--danger-text)' : 'var(--text-dim)' }}>
            {' '}· {count} şampiyon
          </span>
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

          {/* Seçim havuzu boşaltırsa oyun tüm havuza döner — kullanıcı bunu bilsin */}
          {count === 0 && !isAll && (
            <p className="mt-3 rounded-xl border px-3 py-2 text-xs"
              style={{ borderColor: 'var(--danger-text)', color: 'var(--danger-text)' }}>
              Bu kombinasyona uyan şampiyon yok — oyun filtreyi yok sayıp tüm havuzdan soracak.
            </p>
          )}

          <p className="mt-3 text-xs" style={{ color: 'var(--text-dim)' }}>
            Çoklu seçim yapabilirsin: aynı grupta birden fazla seçenek <b>veya</b> demektir
            (Noxus + Ionia = ikisinden biri), farklı gruplar <b>ve</b> ile birleşir
            (Noxus + Büyücü = Noxus'lu büyücüler). Seçiliye tekrar dokunmak kaldırır.
            Günlük modda filtre yoktur — herkes aynı bulmacayı çözer. İstatistikler filtreye göre ayrılmaz.
          </p>
        </div>
      )}
    </div>
  )
}
