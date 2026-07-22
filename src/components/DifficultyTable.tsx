import { RULES, type DiffRules } from '../game/difficulty'
import { DIFFICULTIES } from '../game/types'

/**
 * Zorluk karşılaştırma tablosu. Satırlar doğrudan `RULES`'tan türer —
 * difficulty.ts'te bir eşik değişirse burası da değişir, açıklama asla eskimez.
 *
 * Değerler bilerek çok kısa: tablo 375px'e kaydırmasız sığmalı,
 * uzun ifadeler yerine altta tek satır açıklama var.
 */
const ROWS: { label: string; icon: string; get: (r: DiffRules) => string }[] = [
  { icon: '🎲', label: 'Tahmin hakkı', get: (r) => `${r.maxGuesses}` },
  { icon: '😀', label: 'Açık emoji', get: (r) => `${r.emojiStart}` },
  {
    icon: '😀',
    label: 'Yeni emoji',
    get: (r) => (r.emojiStep === 0 ? '—' : `her ${r.emojiStep}`),
  },
  { icon: '🖼', label: 'Yakınlık', get: (r) => `%${r.zoomStart}` },
  { icon: '👤', label: 'Silüet açılma', get: (r) => `${r.silhouetteReveals} yanlış` },
  { icon: '📜', label: 'Açık cümle', get: (r) => `${r.loreStart}` },
  { icon: '✨', label: 'Yetenek adı', get: (r) => (r.abilityNameAt === null ? '—' : `${r.abilityNameAt}.`) },
  { icon: '🎭', label: 'Şampiyon adı', get: (r) => (r.skinChampionAt === null ? '—' : `${r.skinChampionAt}.`) },
  {
    icon: '🔊',
    label: 'Replik 2',
    get: (r) => (r.quoteSecondAt === null ? '—' : r.quoteSecondAt === 0 ? 'hemen' : `${r.quoteSecondAt}.`),
  },
  {
    icon: '🔊',
    label: 'Replik 3',
    get: (r) => (r.quoteThirdAt === null ? '—' : r.quoteThirdAt === 0 ? 'hemen' : `${r.quoteThirdAt}.`),
  },
  { icon: '🗡', label: 'Eşya statları', get: (r) => (r.itemTagsAt === null ? '—' : `${r.itemTagsAt}.`) },
  { icon: '🗡', label: 'Eşya bileşenleri', get: (r) => (r.itemPartsAt === null ? '—' : `${r.itemPartsAt}.`) },
  { icon: '🗡', label: 'Eşya ikonu', get: (r) => (r.itemIconAt === null ? '—' : `${r.itemIconAt}.`) },
  { icon: '🎯', label: 'Yıl oku', get: (r) => (r.yearArrow ? '✓' : '—') },
  { icon: '🎯', label: 'Sarı hücre', get: (r) => (r.showPartial ? '✓' : '—') },
  { icon: '⏱', label: 'Süre', get: (r) => `${r.timedSeconds}sn` },
]

/** Uzun ad başlıkta yer yemesin */
const SHORT: Record<string, string> = { 'Aşırı Zor': 'Aşırı' }

export default function DifficultyTable() {
  return (
    <div className="w-full">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr>
            <th className="w-[38%] border-b pb-1" style={{ borderColor: 'var(--border)' }} />
            {DIFFICULTIES.map((d) => (
              <th key={d.id} className="border-b pb-1 text-center text-xs uppercase tracking-wide sm:text-xs"
                style={{ borderColor: 'var(--border)', color: 'var(--gold)' }}>
                {SHORT[d.name] ?? d.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label}>
              <td className="py-1 pr-1 text-xs sm:text-xs" style={{ color: 'var(--text-dim)' }}>
                <span className="mr-1">{row.icon}</span>{row.label}
              </td>
              {DIFFICULTIES.map((d) => {
                const v = row.get(RULES[d.id])
                return (
                  <td key={d.id} className="py-1 text-center text-xs tabular-nums sm:text-xs"
                    style={{ color: v === '—' ? 'var(--wrong)' : 'var(--text)' }}>
                    {v}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs leading-snug" style={{ color: 'var(--text-dim)' }}>
        Sayılar ipucunun kaçıncı yanlıştan sonra açıldığını gösterir · "her 2" = iki yanlışta bir yeni emoji ·
        <span style={{ color: 'var(--wrong)' }}> — </span> o zorlukta yok ·
        Tahmin hakkı Zamana Karşı'da uygulanmaz, süre ise yalnızca orada geçerli
      </p>
    </div>
  )
}
