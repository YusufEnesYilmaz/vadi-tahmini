import type { ClassicRow } from '../game/classic'
import { squareUrl } from '../game/data'

// Rol kolonu kaldırıldı (kullanıcı: koridorla çakışıp kafa karıştırıyor)
const HEADERS = ['Şampiyon', 'Cinsiyet', 'Tür', 'Koridor', 'Kaynak', 'Menzil', 'Bölge', 'Yıl']

const CELL_BG = {
  correct: 'var(--correct)',
  partial: 'var(--partial)',
  wrong: 'var(--wrong)',
} as const

function Cell({ result, children, delay = 0 }: { result: keyof typeof CELL_BG; children: React.ReactNode; delay?: number }) {
  return (
    <div
      className="cell-reveal flex min-h-16 items-center justify-center rounded-md p-1 text-center text-xs font-medium leading-tight sm:text-sm"
      style={{ background: CELL_BG[result], color: '#fff', animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/* Hücreler soldan sağa gecikmeli açılsın — sütun sırasına göre 110 ms adım */
const STEP = 110

/** Classic modu tahmin tablosu — en yeni tahmin üstte */
export default function ClassicBoard({ rows, yearArrow = true }: { rows: ClassicRow[]; yearArrow?: boolean }) {
  if (!rows.length) return null
  return (
    <div className="relative w-full min-w-0">
      <div className="w-full min-w-0 overflow-x-auto">
        <div className="min-w-[640px]" style={{ perspective: '700px' }}>
          <div className="mb-1 grid grid-cols-8 gap-1 text-center text-xs uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
            {HEADERS.map((h) => (
              <div key={h} className="border-b pb-1" style={{ borderColor: 'var(--border)' }}>{h}</div>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {rows.map((r) => (
              // anim-row YOK: artık her hücre tek tek çevriliyor (cell-reveal). Yalnız yeni
              // eklenen satır mount olduğunda oynar; eski satırlar zaten mount, tekrar oynamaz.
              <div key={r.champion.id} className="grid grid-cols-8 gap-1">
                <div className="cell-reveal flex min-h-16 flex-col items-center justify-center gap-1 rounded-md p-1"
                  style={{ background: 'var(--bg-card)', animationDelay: '0ms' }}>
                  <img src={squareUrl(r.champion.id)} alt={r.champion.name} className="h-10 w-10 rounded" />
                  <span className="max-w-full truncate text-xs">{r.champion.name}</span>
                </div>
                <Cell result={r.cells.gender} delay={STEP}>{r.champion.gender}</Cell>
                <Cell result={r.cells.species} delay={STEP * 2}>{r.champion.species}</Cell>
                <Cell result={r.cells.lanes} delay={STEP * 3}>{r.champion.lanes.join(', ')}</Cell>
                <Cell result={r.cells.resource} delay={STEP * 4}>{r.champion.resource}</Cell>
                <Cell result={r.cells.rangeType} delay={STEP * 5}>{r.champion.rangeType}</Cell>
                <Cell result={r.cells.region} delay={STEP * 6}>{r.champion.region}</Cell>
                <Cell result={r.cells.year} delay={STEP * 7}>
                  {r.champion.year}
                  {/* Zor ve üstünde ok yok: "daha eski mi yeni mi" bilgisi kalkıyor */}
                  {yearArrow && r.yearHint === 'earlier' && ' ↓'}
                  {yearArrow && r.yearHint === 'later' && ' ↑'}
                </Cell>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Mobilde kenar solması: sağda içerik devam ettiğini gösterir (metin ipucu yerine) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-5 sm:hidden"
        style={{ background: 'linear-gradient(90deg, var(--bg), transparent)' }} aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-6 sm:hidden"
        style={{ background: 'linear-gradient(270deg, var(--bg), transparent)' }} aria-hidden />
    </div>
  )
}
