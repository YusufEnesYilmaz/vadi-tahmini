import { CHAMPIONS } from './data'
import { godMode } from './dev'
import { HUNT_DAILY_KEY } from './miniDaily'
import { fnv1a, seededRng, todayKey } from './rng'
import { toLetters } from './wordle'
import type { Champion } from './types'

/*
 * Şampiyon Avı — hedef şampiyonu ALFABETİK KONUM ipuçlarıyla bul.
 *
 * Her tahmine iki geri bildirim: hedefe alfabetik sıralı listede kaç SIRA uzakta
 * (indeks farkı) + hedef tahminden önce mi sonra mı. 8 deneme SABİT:
 * log2(173) ≈ 7.4 → ipucusuz kör ikili arama tam sınırda; ipucu (bölge/tür)
 * oyunu kazanılabilir kılan şey.
 *
 * 🔴 Sıralama YERELSİZ: `toLetters` (Kai'Sa→KAISA) + düz string karşılaştırma.
 * `localeCompare('tr')` KULLANILMAZ — iki cihazda farklı sıra üretebilir ve
 * "mesafe" herkes için aynı olmalı (Wordle'daki TR yereli dersi).
 */

export const HUNT_MAX_ATTEMPTS = 8

/**
 * İSTEK ÜZERİNE ipucu (2026-07-24): ön seçmeli zorluk şeridi kaldırıldı. Oyun
 * ipucusuz başlar; oyuncu "İpucu aç" ile kademe kademe açar, HER kademe 1 HAK yakar.
 * Kademeler sırayla: Bölge → Rol → Tür (3 kademe, 2026-07-24 içerik turu). Rol çok
 * ayırt edici (havuzu ≥17) → ipucu gerçekten "kim" sorusunu daraltıyor. 3 ipucu + 5
 * tahmin, 173 havuzda ikili arama için hâlâ yeterli (log2 173 ≈ 7.4).
 */
export const HUNT_HINT_TIERS = 3

/** Açılan ipucu kademesine göre metin (0=hiç, 1=bölge, 2=+rol, 3=+tür) */
export function huntHintText(c: Champion, tier: number): string | null {
  if (tier <= 0) return null
  const parts = [`Bölge: ${c.region}`]
  if (tier >= 2) parts.push(`Rol: ${c.roles[0]}`)
  if (tier >= 3) parts.push(`Tür: ${c.species}`)
  return parts.join(' · ')
}

let orderCache: Champion[] | null = null

/** Alfabetik sıralı şampiyon listesi (önbellekli) — mesafenin TEK kaynağı */
export function huntOrder(): Champion[] {
  if (!orderCache) {
    orderCache = [...CHAMPIONS].sort((a, b) => {
      const la = toLetters(a.name)
      const lb = toLetters(b.name)
      return la < lb ? -1 : la > lb ? 1 : a.id < b.id ? -1 : 1
    })
  }
  return orderCache
}

export function huntIndexOf(id: string): number {
  return huntOrder().findIndex((c) => c.id === id)
}

export interface HuntFeedback {
  distance: number
  /** Hedef, tahmine göre alfabetik olarak nerede? */
  dir: 'before' | 'after' | 'correct'
}

export function evaluateHuntGuess(targetId: string, guessId: string): HuntFeedback {
  const ti = huntIndexOf(targetId)
  const gi = huntIndexOf(guessId)
  const distance = Math.abs(ti - gi)
  return { distance, dir: distance === 0 ? 'correct' : ti < gi ? 'before' : 'after' }
}

/**
 * Tahminlerden türeyen mümkün [lo, hi] indeks aralığı (kapsayıcı).
 * Ekstra yardım değil: oyuncunun elindeki bilgiden mekanik olarak çıkanı görselleştirir.
 */
export function narrowRange(targetId: string, guessIds: string[]): [number, number] {
  let lo = 0
  let hi = huntOrder().length - 1
  const ti = huntIndexOf(targetId)
  for (const g of guessIds) {
    const gi = huntIndexOf(g)
    if (gi < 0 || gi === ti) continue
    if (gi < ti) lo = Math.max(lo, gi + 1)
    else hi = Math.min(hi, gi - 1)
  }
  return [lo, hi]
}

/** A–Z şeridi: adlarda geçen BAŞ harfler (veriden türer, elle liste yok) */
export const HUNT_ALPHABET: string[] = [
  ...new Set(CHAMPIONS.map((c) => toLetters(c.name)[0])),
].sort()

/** Aralıktaki şampiyonların baş harfleri — şeritte açık kalacaklar */
export function lettersInRange(lo: number, hi: number): Set<string> {
  const order = huntOrder()
  const out = new Set<string>()
  for (let i = Math.max(0, lo); i <= Math.min(hi, order.length - 1); i++) {
    out.add(toLetters(order[i].name)[0])
  }
  return out
}

/** Günlük hedef — tarihten deterministik (herkese aynı) */
export function dailyHuntTarget(): Champion {
  const rand = seededRng(fnv1a(`${todayKey()}:hunt`))
  return CHAMPIONS[Math.floor(rand() * CHAMPIONS.length)]
}

/** Sınırsız hedef — bir önceki hedef tekrar gelmesin */
export function randomHuntTarget(avoidId?: string): Champion {
  let c = CHAMPIONS[Math.floor(Math.random() * CHAMPIONS.length)]
  for (let i = 0; i < 10 && c.id === avoidId; i++) {
    c = CHAMPIONS[Math.floor(Math.random() * CHAMPIONS.length)]
  }
  return c
}

// ---- Günlük kalıcılık (Bingo kalıbı: her tahminde yaz, bitmişse kilit) ----

export interface HuntDailySave {
  date: string
  targetId: string
  guessIds: string[]
  /** Açılan ipucu kademesi (0-2). Eski kayıtlarda yok → 0. Her kademe 1 hak yakar. */
  hints?: number
  over: boolean
  won: boolean
}

/** Günlük durumu yükler (God Mode açıkken null → hep taze, sınırsız tekrar) */
export function loadDailyHunt(): HuntDailySave | null {
  if (godMode()) return null
  try {
    const raw = localStorage.getItem(HUNT_DAILY_KEY)
    if (!raw) return null
    const save = JSON.parse(raw) as HuntDailySave
    if (save.date !== todayKey()) return null
    if (!Array.isArray(save.guessIds)) return null
    return save
  } catch {
    return null
  }
}

export function saveDailyHunt(save: HuntDailySave): void {
  try {
    localStorage.setItem(HUNT_DAILY_KEY, JSON.stringify(save))
  } catch {
    // localStorage kapalı olabilir
  }
}

/** Galibiyet sayacı + en az tahmin rekoru — rozetler okur */
export function recordHuntWin(guesses: number) {
  localStorage.setItem('vt:hunt:wins', String(Number(localStorage.getItem('vt:hunt:wins') ?? 0) + 1))
  const best = Number(localStorage.getItem('vt:hunt:best') ?? 99)
  if (guesses < best) localStorage.setItem('vt:hunt:best', String(guesses))
}
