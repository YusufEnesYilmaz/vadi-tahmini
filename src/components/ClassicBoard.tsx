import type { ClassicRow } from '../game/classic'
import { squareUrl } from '../game/data'

// Rol kolonu kaldırıldı (kullanıcı: koridorla çakışıp kafa karıştırıyor)
const HEADERS = ['Şampiyon', 'Cinsiyet', 'Koridor', 'Kaynak', 'Menzil', 'Bölge', 'Yıl']

const CELL_BG = {
  correct: 'var(--correct)',
  partial: 'var(--partial)',
  wrong: 'var(--wrong)',
} as const

function Cell({ result, children }: { result: keyof typeof CELL_BG; children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-16 items-center justify-center rounded-md p-1 text-center text-xs font-medium leading-tight sm:text-sm"
      style={{ background: CELL_BG[result], color: '#fff' }}
    >
      {children}
    </div>
  )
}

/** Classic modu tahmin tablosu — en yeni tahmin üstte */
export default function ClassicBoard({ rows }: { rows: ClassicRow[] }) {
  if (!rows.length) return null
  return (
    <div className="w-full min-w-0">
      <div className="w-full min-w-0 overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
            {HEADERS.map((h) => (
              <div key={h} className="border-b pb-1" style={{ borderColor: 'var(--border)' }}>{h}</div>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {rows.map((r) => (
              <div key={r.champion.id} className="anim-row grid grid-cols-7 gap-1">
                <div className="flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-md p-1"
                  style={{ background: 'var(--bg-card)' }}>
                  <img src={squareUrl(r.champion.id)} alt={r.champion.name} className="h-10 w-10 rounded" />
                  <span className="max-w-full truncate text-[10px]">{r.champion.name}</span>
                </div>
                <Cell result={r.cells.gender}>{r.champion.gender}</Cell>
                <Cell result={r.cells.lanes}>{r.champion.lanes.join(', ')}</Cell>
                <Cell result={r.cells.resource}>{r.champion.resource}</Cell>
                <Cell result={r.cells.rangeType}>{r.champion.rangeType}</Cell>
                <Cell result={r.cells.region}>{r.champion.region}</Cell>
                <Cell result={r.cells.year}>
                  {r.champion.year}
                  {r.yearHint === 'earlier' && ' ↓'}
                  {r.yearHint === 'later' && ' ↑'}
                </Cell>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Dar ekranda tablo kaydırılabilir — kullanıcı bunu görmeden kolonları kaçırıyordu */}
      <p className="pt-1.5 text-center text-[11px] sm:hidden" style={{ color: 'var(--text-dim)' }}>
        ← tabloyu yana kaydır →
      </p>
    </div>
  )
}
