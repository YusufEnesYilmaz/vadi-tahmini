import { RULES, type DiffRules } from '../game/difficulty'
import { DIFFICULTIES } from '../game/types'

/**
 * Zorluk karşılaştırma tablosu. Satırlar doğrudan `RULES`'tan türer —
 * difficulty.ts'te bir eşik değişirse burası da değişir, açıklama asla eskimez.
 */
const ROWS: { label: string; get: (r: DiffRules) => string }[] = [
  { label: '😀 Açık başlayan emoji', get: (r) => `${r.emojiStart} tane` },
  {
    label: '😀 Yeni emoji',
    get: (r) => (r.emojiStep === 0 ? 'açılmaz' : r.emojiStep === 1 ? 'her yanlışta' : `${r.emojiStep} yanlışta bir`),
  },
  { label: '🖼 Başlangıç yakınlığı', get: (r) => `%${r.zoomStart}` },
  { label: '✨ Yetenek adı', get: (r) => (r.abilityNameAt === null ? 'yok' : `${r.abilityNameAt}. yanlışta`) },
  { label: '🎭 Şampiyon adı', get: (r) => (r.skinChampionAt === null ? 'yok' : `${r.skinChampionAt}. yanlışta`) },
  {
    label: '🔊 İkinci replik',
    get: (r) => (r.quoteSecondAt === null ? 'yok' : r.quoteSecondAt === 0 ? 'hemen' : `${r.quoteSecondAt}. yanlışta`),
  },
  { label: '🎯 Yıl oku ↑↓', get: (r) => (r.yearArrow ? 'var' : 'yok') },
  { label: '🎯 Sarı (kısmi) hücre', get: (r) => (r.showPartial ? 'var' : 'yok') },
  { label: '⏱ Süre', get: (r) => `${r.timedSeconds} sn` },
]

export default function DifficultyTable() {
  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b pb-1 text-left text-[11px] uppercase tracking-wide"
              style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }} />
            {DIFFICULTIES.map((d) => (
              <th key={d.id} className="border-b px-1 pb-1 text-center text-[11px] uppercase tracking-wide"
                style={{ borderColor: 'var(--border)', color: 'var(--gold)' }}>
                {d.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label}>
              <td className="whitespace-nowrap py-1.5 pr-2 text-xs" style={{ color: 'var(--text-dim)' }}>
                {row.label}
              </td>
              {DIFFICULTIES.map((d) => {
                const v = row.get(RULES[d.id])
                const off = v === 'yok' || v === 'açılmaz'
                return (
                  <td key={d.id} className="px-1 py-1.5 text-center text-xs tabular-nums"
                    style={{ color: off ? 'var(--wrong)' : 'var(--text)' }}>
                    {v}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
