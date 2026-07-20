import type { SubMode, TopMode } from './types'
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

function statsKey(top: TopMode, sub: SubMode) {
  return `vt:stats:${top}:${sub}`
}

export function getStats(top: TopMode, sub: SubMode): ModeStats {
  try {
    const raw = localStorage.getItem(statsKey(top, sub))
    if (raw) return { ...emptyStats, ...JSON.parse(raw) }
  } catch { /* bozuksa sıfırdan */ }
  return { ...emptyStats }
}

export function recordGame(top: TopMode, sub: SubMode, won: boolean, guesses: number) {
  const s = getStats(top, sub)
  s.played++
  if (won) {
    s.won++
    s.currentStreak++
    s.totalGuesses += guesses
    if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak
  } else {
    s.currentStreak = 0
  }
  localStorage.setItem(statsKey(top, sub), JSON.stringify(s))
}

// ---- Zamana Karşı en iyi skor ----

export function getBestScore(sub: SubMode): number {
  return Number(localStorage.getItem(`vt:best:${sub}`) ?? 0)
}

export function recordScore(sub: SubMode, score: number): boolean {
  if (score > getBestScore(sub)) {
    localStorage.setItem(`vt:best:${sub}`, String(score))
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
}
