import type { ClassicRow } from './classic'
import type { PlaySub } from './types'
import { subMeta } from './types'
import { todayKey } from './rng'

function subName(sub: PlaySub) {
  return subMeta(sub).name // mix → "Karışık"
}

const CELL_EMOJI = { correct: '🟩', partial: '🟨', wrong: '🟥' } as const

/** Günlük Klasik: renk tablosunu Wordle tarzı emoji grid'e çevir */
export function shareDailyClassic(rows: ClassicRow[], won: boolean): string {
  const grid = rows
    .map((r) =>
      [r.cells.gender, r.cells.lanes, r.cells.resource, r.cells.rangeType, r.cells.region, r.cells.year]
        .map((c) => CELL_EMOJI[c])
        .join(''),
    )
    .join('\n')
  const head = won ? `${rows.length} denemede bildim!` : 'Bilemedim 😔'
  return `Vadi Tahmini — Günlük Klasik ${todayKey()}\n${head}\n${grid}`
}

/** Günlük Yetenek/Görsel/Kostüm: deneme sayısı grid'i */
export function shareDailySimple(sub: PlaySub, guessCount: number, won: boolean, slotOk?: boolean): string {
  const grid = won ? '⬛'.repeat(guessCount - 1) + '🟩' : '⬛'.repeat(guessCount)
  const head = won ? `${guessCount} denemede bildim!` : 'Bilemedim 😔'
  // Yetenek modunda tuş bonusu da paylaşılır (undefined = bonus yok/atlandı)
  const bonus = slotOk === undefined ? '' : `\nTuş: ${slotOk ? '🟩' : '🟥'}`
  return `Vadi Tahmini — Günlük ${subName(sub)} ${todayKey()}\n${head}\n${grid}${bonus}`
}

/** Zamana Karşı skoru */
export function shareTimed(sub: PlaySub, score: number, isRecord: boolean): string {
  const rekor = isRecord ? ' 🏆 YENİ REKOR!' : ''
  return `Vadi Tahmini — Zamana Karşı ${subName(sub)}\n⏱ 60 saniyede ${score} doğru!${rekor}`
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Clipboard API engelliyse (eski WebView, izin politikası) klasik yönteme düş
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}
