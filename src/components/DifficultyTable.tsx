import React from 'react'
import { RULES, type DiffRules } from '../game/difficulty'
import { DIFFICULTIES, type Difficulty } from '../game/types'

interface DifficultyMeta {
  id: Difficulty
  name: string
  shortName: string
  icon: string
  color: string
  bgColor: string
  borderColor: string
  /** Yalnız GÖRSEL kimlik: ad, ikon, renk. Sayılar burada TUTULMAZ — aşağıya bak. */
}

/**
 * Rozet metni `RULES`'tan TÜRETİLİR, elle yazılmaz.
 * Önceden `badgeText: '10 Hak · 90s · Bol İpucu'` diye sabit string'di: `RULES`
 * değişince tablo satırları güncelleniyor ama bu rozet eski sayıyı söylemeye
 * devam ediyordu — aynı ekranda iki farklı gerçek. Tek kaynak `difficulty.ts`.
 */
/**
 * "İpucu cimriliği" puanı — küçük = cömert. Yalnız `RULES`'tan okunur.
 * İlk denemem "kaç ipucu HİÇ açılmıyor" saymaktı; yanlıştı: Normal ve Zor'da hiçbiri
 * kapalı değil, ikisi de "Bol İpucu" çıkıyordu. Belirleyici olan kapalı olması değil,
 * ipuçlarının NE KADAR GEÇ açıldığı.
 */
function hintStinginess(r: DiffRules): number {
  const gecikmeler = [r.abilityNameAt, r.skinChampionAt, r.quoteSecondAt, r.quoteThirdAt, r.itemIconAt, r.itemTagsAt, r.itemPartsAt]
  // null = hiç açılmaz → en ağır ceza (en geç açılandan da beter)
  const toplam = gecikmeler.reduce<number>((a, v) => a + (v === null ? 12 : v), 0)
  // Silüet geç aydınlanıyorsa cimri; baştan açık emoji/cümle cömert
  return toplam + r.silhouetteReveals - r.emojiStart - r.loreStart
}

/** Cimrilik sırasına göre etiket — sıralama değişirse etiketler kendiliğinden yer değiştirir */
const YOGUNLUK_ETIKETLERI = ['Bol İpucu', 'Standart', 'Az İpucu', 'Minimum']

function badgeText(id: Difficulty): string {
  const r = RULES[id]
  const sirali = DIFFICULTIES.map((d) => d.id).sort((a, b) => hintStinginess(RULES[a]) - hintStinginess(RULES[b]))
  const yogunluk = YOGUNLUK_ETIKETLERI[sirali.indexOf(id)] ?? YOGUNLUK_ETIKETLERI[YOGUNLUK_ETIKETLERI.length - 1]
  return `${r.maxGuesses} Hak · ${r.timedSeconds}s · ${yogunluk}`
}

const DIFF_META: DifficultyMeta[] = [
  {
    id: 'easy',
    name: 'Kolay',
    shortName: 'Kolay',
    icon: '🟢',
    color: 'var(--accent-done)',
    bgColor: 'rgba(var(--accent-done-rgb), 0.12)',
    borderColor: 'rgba(var(--accent-done-rgb), 0.3)',
  },
  {
    id: 'normal',
    name: 'Normal',
    shortName: 'Normal',
    icon: '🟡',
    color: 'var(--gold-bright)',
    bgColor: 'rgba(var(--gold-glow-rgb), 0.12)',
    borderColor: 'rgba(var(--gold-glow-rgb), 0.3)',
  },
  {
    id: 'hard',
    name: 'Zor',
    shortName: 'Zor',
    icon: '🟠',
    color: 'var(--diff-hard)',
    bgColor: 'rgba(var(--diff-hard-rgb), 0.12)',
    borderColor: 'rgba(var(--diff-hard-rgb), 0.3)',
  },
  {
    id: 'insane',
    name: 'Aşırı Zor',
    shortName: 'Aşırı',
    icon: '🔴',
    color: 'var(--danger-text)',
    bgColor: 'rgba(var(--danger-text-rgb), 0.12)',
    borderColor: 'rgba(var(--danger-text-rgb), 0.3)',
  },
]

interface RowDef {
  icon: string
  label: string
  render: (r: DiffRules) => React.ReactNode
}

interface SectionDef {
  title: string
  rows: RowDef[]
}

const SECTIONS: SectionDef[] = [
  {
    title: '🎯 Temel Kurallar & Haklar',
    rows: [
      {
        icon: '🎲',
        label: 'Tahmin Hakkı (Sınırsız)',
        render: (r) => <span className="font-bold text-amber-300">{r.maxGuesses} hak</span>,
      },
      {
        icon: '⏱️',
        label: 'Süre (Zamana Karşı)',
        render: (r) => <span className="font-semibold" style={{ color: 'var(--text)' }}>{r.timedSeconds}s</span>,
      },
      {
        icon: '🏹',
        label: 'Yıl İpucu Okları (↑ ↓)',
        render: (r) =>
          r.yearArrow ? (
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold text-emerald-400" style={{ background: 'rgba(var(--accent-done-rgb), 0.15)' }}>
              ✓ Var
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium opacity-60" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-dim)' }}>
              — Yok
            </span>
          ),
      },
      {
        icon: '🟨',
        label: 'Kısmi Eşleşme (Sarı Hücre)',
        render: (r) =>
          r.showPartial ? (
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold text-amber-400" style={{ background: 'rgba(var(--gold-glow-rgb), 0.15)' }}>
              ✓ Var
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium opacity-60" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-dim)' }}>
              — Yok
            </span>
          ),
      },
    ],
  },
  {
    title: '💡 Açılan İpuçları (Kaçıncı Yanlışta)',
    rows: [
      {
        icon: '✨',
        label: 'Yetenek Adı',
        render: (r) =>
          r.abilityNameAt === null ? (
            <span className="opacity-40">—</span>
          ) : (
            <span className="font-semibold">{r.abilityNameAt}. yanlış</span>
          ),
      },
      {
        icon: '🎭',
        label: 'Kostüm — Şampiyon Adı',
        render: (r) =>
          r.skinChampionAt === null ? (
            <span className="opacity-40">—</span>
          ) : (
            <span className="font-semibold">{r.skinChampionAt}. yanlış</span>
          ),
      },
      {
        icon: '🔊',
        label: 'Replik — 2. Klip (Seçim)',
        render: (r) =>
          r.quoteSecondAt === null ? (
            <span className="opacity-40">—</span>
          ) : r.quoteSecondAt === 0 ? (
            <span className="font-bold text-emerald-400">Anında</span>
          ) : (
            <span className="font-semibold">{r.quoteSecondAt}. yanlış</span>
          ),
      },
      {
        icon: '🔊',
        label: 'Replik — 3. Klip (Banned)',
        render: (r) =>
          r.quoteThirdAt === null ? (
            <span className="opacity-40">—</span>
          ) : (
            <span className="font-semibold">{r.quoteThirdAt}. yanlış</span>
          ),
      },
      {
        icon: '🗡️',
        label: 'Eşya — Stat Etiketleri',
        render: (r) =>
          r.itemTagsAt === null ? (
            <span className="opacity-40">—</span>
          ) : (
            <span className="font-semibold">{r.itemTagsAt}. yanlış</span>
          ),
      },
      {
        icon: '🗡️',
        label: 'Eşya — Bileşen İkonları',
        render: (r) =>
          r.itemPartsAt === null ? (
            <span className="opacity-40">—</span>
          ) : (
            <span className="font-semibold">{r.itemPartsAt}. yanlış</span>
          ),
      },
      {
        icon: '🗡️',
        label: 'Eşya — Net İkon',
        render: (r) =>
          r.itemIconAt === null ? (
            <span className="opacity-40">—</span>
          ) : (
            <span className="font-semibold">{r.itemIconAt}. yanlış</span>
          ),
      },
    ],
  },
  {
    title: '🎨 Görsel & Emoji İpuçları',
    rows: [
      {
        icon: '🖼️',
        label: 'Görsel Yakınlaştırma',
        render: (r) => <span className="font-semibold">%{r.zoomStart}</span>,
      },
      {
        icon: '👤',
        label: 'Silüet Tam Aydınlanma',
        render: (r) => <span className="font-semibold">{r.silhouetteReveals} yanlış</span>,
      },
      {
        icon: '📜',
        label: 'Hikâye — Açık Cümle',
        render: (r) => <span className="font-semibold">{r.loreStart} cümle</span>,
      },
      {
        icon: '😀',
        label: 'Açık / Yeni Emoji',
        render: (r) => (
          <span className="font-semibold">
            {r.emojiStart} açık {r.emojiStep > 0 ? `(her ${r.emojiStep} yanlışta +1)` : ''}
          </span>
        ),
      },
    ],
  },
]

export default function DifficultyTable() {
  return (
    <div className="flex w-full flex-col gap-4">
      {/* Üst Kartlar: 4 Zorluk Seviyesinin Hızlı Özeti */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {DIFF_META.map((m) => (
          <div
            key={m.id}
            className="flex flex-col items-center rounded-xl border p-2 text-center transition-transform hover:scale-[1.02]"
            style={{ background: m.bgColor, borderColor: m.borderColor }}
          >
            <div className="flex items-center gap-1.5 font-bold text-sm" style={{ color: m.color }}>
              <span>{m.icon}</span>
              <span>{m.name}</span>
            </div>
            <span className="mt-1 text-[11px] font-medium opacity-90" style={{ color: 'var(--text)' }}>
              {badgeText(m.id)}
            </span>
          </div>
        ))}
      </div>

      {/* Detaylı Kategorize Edilmiş Karşılaştırma Tablosu */}
      <div className="w-full overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <table className="w-full min-w-[500px] border-collapse text-left text-xs sm:text-xs">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)', background: 'rgba(255, 255, 255, 0.03)' }}>
              <th className="w-[40%] p-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                İpucu & Kural
              </th>
              {DIFF_META.map((m) => (
                <th key={m.id} className="p-2.5 text-center font-bold text-xs" style={{ color: m.color }}>
                  {m.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((sec) => (
              <React.Fragment key={sec.title}>
                {/* Bölüm Başlığı */}
                <tr style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                  <td colSpan={5} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--gold-bright)' }}>
                    {sec.title}
                  </td>
                </tr>
                {/* Bölüm Satırları */}
                {sec.rows.map((row, idx) => (
                  <tr
                    key={row.label}
                    className="border-b transition-colors hover:bg-white/[0.04]"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.04)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                    }}
                  >
                    <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--text)' }}>
                      <span className="mr-1.5">{row.icon}</span>
                      {row.label}
                    </td>
                    {DIFF_META.map((m) => {
                      const rules = RULES[m.id]
                      return (
                        <td key={m.id} className="px-2 py-2 text-center text-xs">
                          {row.render(rules)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Alt Açıklama Bilgisi */}
      <p className="text-[11px] leading-relaxed opacity-85" style={{ color: 'var(--text-dim)' }}>
        💡 <b style={{ color: 'var(--text)' }}>Not:</b> Günlük bulmacalar her zaman <b style={{ color: 'var(--gold)' }}>Normal</b> zorluk seviyesinde oynanır. Zamana Karşı modunda tahmin hakkı sınırı yoktur, performans süreye dayanır.
      </p>
    </div>
  )
}
