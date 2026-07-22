import { CHAMPIONS } from './data'
import { dailyIndex } from './rng'
import type { Champion } from './types'

/**
 * Kelime modu — şampiyon adını harf harf bul (Wordle mekaniği).
 *
 * Adlar harfe indirgenir: boşluk, kesme işareti ve nokta atılır
 * ("Kai'Sa" → KAISA, "Dr. Mundo" → DRMUNDO). Yoksa oyuncu hangi hücrede
 * kesme işareti olduğunu bilmek zorunda kalır ve bu bedava ipucu olur.
 *
 * Tahmin, hedefle AYNI harf sayısında bir şampiyon olmak zorunda —
 * ızgara sabit genişlikte, kısa/uzun ad sığmaz.
 */

/** Görünen addan oyun harflerine: TR büyük harf, yalnız harfler */
export function toLetters(name: string): string {
  return name
    // TR yerelinde DEĞİL: toLocaleUpperCase('tr') "Irelia"yı "İRELİA" yapıyor.
    // Şampiyon adları yabancı, özgün yazımları korunmalı (KAISA, IRELIA).
    .toUpperCase()
    .replace(/[^A-ZÇĞİÖŞÜ]/g, '')
}

/**
 * Harf tahtası: şampiyon adlarında GEÇEN tüm harfler (veriden türer, elle liste yok).
 * Q/W/X gibi TR alfabesinde olmayan ama adlarda geçen harfleri de içerir;
 * hiç geçmeyen harfle boş yere kutu koymaz. Sıralama TR yerelinde.
 */
export const ALPHABET: string[] = [
  ...new Set(CHAMPIONS.flatMap((c) => [...toLetters(c.name)])),
].sort((a, b) => a.localeCompare(b, 'tr'))

export type LetterResult = 'correct' | 'present' | 'absent'

/**
 * Wordle değerlendirmesi — tekrarlı harf kuralı dahil.
 * Önce tam isabetler işaretlenir, kalan harfler havuzdan düşülerek "var ama
 * yeri yanlış" verilir. Bu olmadan "AAA" tahmini tek A'lı hedefte üç sarı yakar.
 */
export function evaluateWord(guess: string, target: string): LetterResult[] {
  const g = [...guess]
  const t = [...target]
  const out: LetterResult[] = new Array(g.length).fill('absent')
  const kalan = new Map<string, number>()

  for (let i = 0; i < g.length; i++) {
    if (g[i] === t[i]) out[i] = 'correct'
    else kalan.set(t[i], (kalan.get(t[i]) ?? 0) + 1)
  }
  for (let i = 0; i < g.length; i++) {
    if (out[i] === 'correct') continue
    const n = kalan.get(g[i]) ?? 0
    if (n > 0) {
      out[i] = 'present'
      kalan.set(g[i], n - 1)
    }
  }
  return out
}

/** Klavye rengi: aynı harfin en iyi sonucu kalır (yeşil > sarı > gri) */
export function mergeKeyState(a: LetterResult | undefined, b: LetterResult): LetterResult {
  const rank = { absent: 0, present: 1, correct: 2 } as const
  return a && rank[a] >= rank[b] ? a : b
}

/**
 * Havuz: adı 4-10 harf olan şampiyonlar.
 * Alt sınır tahmini imkânsız kılan çok kısa adları (Vi, Zac) eler;
 * üst sınır ızgaranın telefonda taşmasını önler.
 */
export const MIN_LEN = 4
export const MAX_LEN = 10

/**
 * Uzunluk şeridi. Havuz kendiliğinden 5-6 harflilere yığılıyor (%53) —
 * kadroda kısa adlar çoğunlukta. Oyuncu isterse boyu kendi seçsin.
 * "Karışık" seçilirse doğal dağılım korunur.
 */
export type LenBucket = 'all' | 'kisa' | 'orta' | 'uzun'

export const LEN_BUCKETS: { id: LenBucket; name: string; min: number; max: number }[] = [
  { id: 'all', name: 'Karışık', min: MIN_LEN, max: MAX_LEN },
  { id: 'kisa', name: 'Kısa', min: 4, max: 5 },
  { id: 'orta', name: 'Orta', min: 6, max: 7 },
  { id: 'uzun', name: 'Uzun', min: 8, max: MAX_LEN },
]

export function bucketOf(id: LenBucket) {
  return LEN_BUCKETS.find((b) => b.id === id) ?? LEN_BUCKETS[0]
}

export function wordlePool(bucket: LenBucket = 'all'): Champion[] {
  const b = bucketOf(bucket)
  return CHAMPIONS.filter((c) => {
    const n = toLetters(c.name).length
    return n >= b.min && n <= b.max
  })
}

const LEN_KEY = 'vt:wordle:len'

export function getLenBucket(): LenBucket {
  const v = localStorage.getItem(LEN_KEY)
  return LEN_BUCKETS.some((b) => b.id === v) ? (v as LenBucket) : 'all'
}

export function setLenBucket(b: LenBucket) {
  localStorage.setItem(LEN_KEY, b)
}

// ---- Kelime galibiyet kaydı (rozetler için) ----

const WINS_KEY = 'vt:wordle:wins'
const BEST_KEY = 'vt:wordle:bestTries' // en az denemeyle kazanma (küçük daha iyi)

export function getWordleWins(): number {
  return Number(localStorage.getItem(WINS_KEY) ?? 0)
}

/** En az kaç denemeyle kazanıldı — hiç kazanılmadıysa MAX_TRIES+1 döner */
export function getWordleBestTries(): number {
  return Number(localStorage.getItem(BEST_KEY) ?? 99)
}

export function recordWordleWin(tries: number) {
  localStorage.setItem(WINS_KEY, String(getWordleWins() + 1))
  if (tries < getWordleBestTries()) localStorage.setItem(BEST_KEY, String(tries))
}

/** Aynı uzunluktaki şampiyonlar — geçerli tahmin listesi */
export function sameLengthChampions(len: number): Champion[] {
  return CHAMPIONS.filter((c) => toLetters(c.name).length === len)
}

/**
 * Günlük hedef: tarihten türer, herkeste aynı.
 * Uzunluk şeridini BİLEREK yok sayar — oyuncunun tercihi günlüğü değiştirseydi
 * herkes farklı kelime görürdü ve skor karşılaştırması anlamsızlaşırdı.
 */
export function dailyWord(): Champion {
  const pool = wordlePool('all')
  return pool[dailyIndex('wordle', pool.length)]
}
