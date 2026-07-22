import type { Difficulty } from './types'

/**
 * Zorluk kuralları — TEK KAYNAK.
 * Bir modun ipucu davranışını değiştireceksen bileşende değil burada değiştir.
 * Günlük mod her zaman 'normal' kullanır (herkes aynı şartlarda oynasın).
 */
export interface DiffRules {
  /** Emoji: baştan kaç tanesi açık */
  emojiStart: number
  /** Emoji: kaç yanlışta bir yenisi açılır (0 = hiç açılmaz) */
  emojiStep: number
  /** Görsel/Kostüm: başlangıç yakınlaştırma yüzdesi */
  zoomStart: number
  /** Görsel/Kostüm: her yanlışta ne kadar uzaklaşılır */
  zoomStep: number
  /** Yetenek: kaçıncı yanlışta yeteneğin adı verilir (null = hiç) */
  abilityNameAt: number | null
  /** Kostüm: kaçıncı yanlışta şampiyon adı verilir (null = hiç) */
  skinChampionAt: number | null
  /** Replik: kaçıncı yanlışta ikinci klip açılır (null = hiç) */
  quoteSecondAt: number | null
  /** Replik: kaçıncı yanlışta üçüncü klip (seçim efekti) açılır (null = hiç) */
  quoteThirdAt: number | null
  /**
   * Eşya: kaçıncı yanlışta İKON gösterilir (null = hiç).
   * Mod ters çevrildi (2026-07-21): ikon artık soru değil, en güçlü ipucu.
   */
  itemIconAt: number | null
  /** Eşya: kaçıncı yanlışta stat etiketleri verilir (null = hiç) */
  itemTagsAt: number | null
  /** Eşya: kaçıncı yanlışta bileşen ikonları gösterilir (null = hiç) */
  itemPartsAt: number | null
  /** Klasik: yıl hücresindeki ↑ ↓ okları gösterilsin mi */
  yearArrow: boolean
  /** Klasik: kısmi eşleşme sarı gösterilsin mi (false = gri, yani "yanlış" gibi) */
  showPartial: boolean
  /** Silüet: kaç yanlıştan sonra görsel tamamen aydınlanır */
  silhouetteReveals: number
  /** Hikâye: baştan kaç cümle açık gelir (her yanlışta +1) */
  loreStart: number
  /** Zamana Karşı: tur süresi */
  timedSeconds: number
  /**
   * Sınırsız ve Günlük'te tahmin hakkı. Bu olmadan kaybetmek imkânsızdı,
   * dolayısıyla "kazanma oranı" istatistiği de anlamsızdı.
   * Zamana Karşı'da uygulanmaz — orada baskıyı süre kuruyor.
   */
  maxGuesses: number
}

export const RULES: Record<Difficulty, DiffRules> = {
  easy: {
    emojiStart: 2, emojiStep: 1,
    zoomStart: 300, zoomStep: 50,
    abilityNameAt: 2, skinChampionAt: 1, quoteSecondAt: 0, quoteThirdAt: 1,
    itemIconAt: 2, itemTagsAt: 1, itemPartsAt: 2,
    yearArrow: true, showPartial: true,
    timedSeconds: 90, maxGuesses: 10, silhouetteReveals: 3, loreStart: 3,
  },
  normal: {
    emojiStart: 1, emojiStep: 1,
    zoomStart: 500, zoomStep: 70,
    abilityNameAt: 3, skinChampionAt: 3, quoteSecondAt: 2, quoteThirdAt: 3,
    itemIconAt: 4, itemTagsAt: 2, itemPartsAt: 4,
    yearArrow: true, showPartial: true,
    timedSeconds: 60, maxGuesses: 8, silhouetteReveals: 5, loreStart: 2,
  },
  hard: {
    emojiStart: 1, emojiStep: 2,
    zoomStart: 700, zoomStep: 70,
    abilityNameAt: 5, skinChampionAt: 5, quoteSecondAt: 4, quoteThirdAt: 5,
    itemIconAt: 6, itemTagsAt: 3, itemPartsAt: 5,
    yearArrow: false, showPartial: true,
    timedSeconds: 45, maxGuesses: 6, silhouetteReveals: 7, loreStart: 1,
  },
  insane: {
    emojiStart: 1, emojiStep: 3,
    zoomStart: 900, zoomStep: 40,
    abilityNameAt: null, skinChampionAt: null, quoteSecondAt: null, quoteThirdAt: null,
    itemIconAt: null, itemTagsAt: 4, itemPartsAt: null,
    yearArrow: false, showPartial: false,
    timedSeconds: 30, maxGuesses: 5, silhouetteReveals: 10, loreStart: 1,
  },
}

const KEY = 'vt:difficulty'

export function getDifficulty(): Difficulty {
  const d = localStorage.getItem(KEY)
  return d === 'easy' || d === 'hard' || d === 'insane' ? d : 'normal'
}

export function setDifficulty(d: Difficulty) {
  localStorage.setItem(KEY, d)
}

/** Günlük'te zorluk yok — herkes aynı bulmacayı aynı ipuçlarıyla çözer */
export function rulesFor(top: string, d: Difficulty): DiffRules {
  return RULES[top === 'daily' ? 'normal' : d]
}
