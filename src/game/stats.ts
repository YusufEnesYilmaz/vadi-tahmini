import type { Difficulty, SubMode, TopMode } from './types'
import { todayKey } from './rng'

/** Mod başına istatistik — localStorage */
export interface ModeStats {
  played: number
  won: number
  currentStreak: number
  bestStreak: number
  totalGuesses: number // kazanılan oyunlardaki toplam tahmin (ortalama için)
}

const emptyStats: ModeStats = { played: 0, won: 0, currentStreak: 0, bestStreak: 0, totalGuesses: 0 }

/**
 * Zorluk anahtarın parçası: Aşırı Zor'da 8 denemede bilmekle Kolay'da 2'de bilmek
 * aynı istatistiğe yazılırsa hiçbiri anlam ifade etmez. Günlük'te zorluk yok.
 */
function statsKey(top: TopMode, sub: SubMode, diff: Difficulty) {
  return top === 'daily' ? `vt:stats:daily:${sub}` : `vt:stats:${top}:${sub}:${diff}`
}

export function getStats(top: TopMode, sub: SubMode, diff: Difficulty): ModeStats {
  try {
    const raw = localStorage.getItem(statsKey(top, sub, diff))
    if (raw) return { ...emptyStats, ...JSON.parse(raw) }
  } catch { /* bozuksa sıfırdan */ }
  return { ...emptyStats }
}

export function recordGame(top: TopMode, sub: SubMode, diff: Difficulty, won: boolean, guesses: number) {
  const s = getStats(top, sub, diff)
  s.played++
  if (won) {
    s.won++
    s.currentStreak++
    s.totalGuesses += guesses
    if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak
  } else {
    s.currentStreak = 0
  }
  localStorage.setItem(statsKey(top, sub, diff), JSON.stringify(s))
}

// ---- Zamana Karşı en iyi skor (zorluk başına ayrı: süreler bile farklı) ----

export function getBestScore(sub: SubMode, diff: Difficulty): number {
  return Number(localStorage.getItem(`vt:best:${sub}:${diff}`) ?? 0)
}

export function recordScore(sub: SubMode, diff: Difficulty, score: number): boolean {
  if (score > getBestScore(sub, diff)) {
    localStorage.setItem(`vt:best:${sub}:${diff}`, String(score))
    return true // yeni rekor
  }
  return false
}

// ---- Günlük mod: bugünkü oyun durumu (bir kez oynanır) ----

export interface DailyState {
  date: string
  guesses: string[] // tahmin edilen id'ler
  done: boolean
  won: boolean
  slot?: number | null // Yetenek modu bonusu: seçilen tuş (0=Pasif, 1..4=Q W E R)
}

function dailyKey(sub: SubMode) {
  return `vt:daily:${sub}`
}

export function getDailyState(sub: SubMode): DailyState {
  try {
    const raw = localStorage.getItem(dailyKey(sub))
    if (raw) {
      const s = JSON.parse(raw) as DailyState
      if (s.date === todayKey()) return s
    }
  } catch { /* yoksay */ }
  return { date: todayKey(), guesses: [], done: false, won: false, slot: null }
}

export function saveDailyState(sub: SubMode, s: DailyState) {
  localStorage.setItem(dailyKey(sub), JSON.stringify(s))
  if (s.won) bumpDailyStreak()
}

// ---- Günlük seri: üst üste kaç gün oynandı (mod fark etmez) ----

export interface DailyStreak {
  last: string // en son oynanan gün (YYYY-MM-DD)
  streak: number
  best: number
}

const DSTREAK_KEY = 'vt:dstreak'

export function getDailyStreak(): DailyStreak {
  try {
    const raw = localStorage.getItem(DSTREAK_KEY)
    if (raw) return JSON.parse(raw) as DailyStreak
  } catch { /* yoksay */ }
  return { last: '', streak: 0, best: 0 }
}

function dayBefore(key: string): string {
  const d = new Date(`${key}T12:00:00`) // öğlen: yaz saati kaymalarından etkilenmesin
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** Bugün ilk kez bir günlük bulmaca kazanıldığında çağrılır */
function bumpDailyStreak() {
  const today = todayKey()
  const s = getDailyStreak()
  if (s.last === today) return // bugün zaten sayıldı
  s.streak = s.last === dayBefore(today) ? s.streak + 1 : 1 // gün atlandıysa sıfırdan
  s.last = today
  s.best = Math.max(s.best, s.streak)
  localStorage.setItem(DSTREAK_KEY, JSON.stringify(s))
}

/** Seri hâlâ canlı mı — dün ya da bugün oynanmışsa evet */
export function isStreakAlive(s: DailyStreak): boolean {
  const today = todayKey()
  return s.last === today || s.last === dayBefore(today)
}
