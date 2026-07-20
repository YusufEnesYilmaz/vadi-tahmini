import type { Difficulty, PlaySub, SubMode, TopMode } from './types'
import { todayKey } from './rng'

/** Mod başına istatistik — localStorage */
/** Tahmin dağılımı kutuları: 1, 2, 3, 4, 5, 6+ */
export const DIST_BUCKETS = 6

export interface ModeStats {
  played: number
  won: number
  currentStreak: number
  bestStreak: number
  totalGuesses: number // kazanılan oyunlardaki toplam tahmin (ortalama için)
  firstTry: number // ilk tahminde bilme sayısı
  firstTryStreak: number // üst üste ilk tahminde bilme
  bestFirstTryStreak: number
  dist: number[] // kaç oyunu kaç tahminde bitirdi (son kutu "6+")
  totalScore: number // yalnız Zamana Karşı: turlarda toplanan doğru sayısı
}

const emptyStats: ModeStats = {
  played: 0, won: 0, currentStreak: 0, bestStreak: 0, totalGuesses: 0,
  firstTry: 0, firstTryStreak: 0, bestFirstTryStreak: 0,
  dist: Array(DIST_BUCKETS).fill(0),
  totalScore: 0,
}

/**
 * Zorluk anahtarın parçası: Aşırı Zor'da 8 denemede bilmekle Kolay'da 2'de bilmek
 * aynı istatistiğe yazılırsa hiçbiri anlam ifade etmez. Günlük'te zorluk yok.
 */
function statsKey(top: TopMode, sub: PlaySub, diff: Difficulty) {
  return top === 'daily' ? `vt:stats:daily:${sub}` : `vt:stats:${top}:${sub}:${diff}`
}

export function getStats(top: TopMode, sub: PlaySub, diff: Difficulty): ModeStats {
  try {
    const raw = localStorage.getItem(statsKey(top, sub, diff))
    if (raw) {
      const s = { ...emptyStats, ...JSON.parse(raw) } as ModeStats
      // Eski kayıtlarda dist olmayabilir ya da kısa olabilir — normalize et
      if (!Array.isArray(s.dist) || s.dist.length !== DIST_BUCKETS) {
        s.dist = Array(DIST_BUCKETS).fill(0)
      }
      return s
    }
  } catch { /* bozuksa sıfırdan */ }
  return { ...emptyStats, dist: Array(DIST_BUCKETS).fill(0) }
}

export function recordGame(top: TopMode, sub: PlaySub, diff: Difficulty, won: boolean, guesses: number) {
  const s = getStats(top, sub, diff)
  s.played++
  if (won) {
    s.won++
    s.currentStreak++
    s.totalGuesses += guesses
    if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak

    // Tahmin dağılımı: son kutu "6+" (uzun kuyruğu tek yerde topla)
    s.dist[Math.min(guesses, DIST_BUCKETS) - 1]++

    // İlk tahminde bilme: hem toplam hem üst üste serisi
    if (guesses === 1) {
      s.firstTry++
      s.firstTryStreak++
      if (s.firstTryStreak > s.bestFirstTryStreak) s.bestFirstTryStreak = s.firstTryStreak
    } else {
      s.firstTryStreak = 0
    }
  } else {
    s.currentStreak = 0
    s.firstTryStreak = 0
  }
  localStorage.setItem(statsKey(top, sub, diff), JSON.stringify(s))
}

// ---- Zamana Karşı en iyi skor (zorluk başına ayrı: süreler bile farklı) ----

export function getBestScore(sub: PlaySub, diff: Difficulty): number {
  return Number(localStorage.getItem(`vt:best:${sub}:${diff}`) ?? 0)
}

/**
 * Zamana Karşı'da bir tur bitti. `recordGame` buraya uymuyor:
 * orada "kazandın mı / kaç tahminde" var, burada süre dolunca tur biter.
 * Sayılan şey: kaç tur oynandı ve turlarda toplam kaç doğru yapıldı.
 */
export function recordTimedRun(sub: PlaySub, diff: Difficulty, score: number) {
  const s = getStats('timed', sub, diff)
  s.played++
  s.totalScore += score
  localStorage.setItem(statsKey('timed', sub, diff), JSON.stringify(s))
}

/** Zamana Karşı: Pas kullanmadan üst üste bilinen en uzun seri */
export function getBestCombo(sub: PlaySub, diff: Difficulty): number {
  return Number(localStorage.getItem(`vt:combo:${sub}:${diff}`) ?? 0)
}

export function recordCombo(sub: PlaySub, diff: Difficulty, combo: number): boolean {
  if (combo > getBestCombo(sub, diff)) {
    localStorage.setItem(`vt:combo:${sub}:${diff}`, String(combo))
    return true
  }
  return false
}

export function recordScore(sub: PlaySub, diff: Difficulty, score: number): boolean {
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
  if (s.won) {
    bumpDailyStreak()
    recordDailyWin(sub, s.date, s.guesses.length)
  } else if (s.done) {
    recordDailyLoss(sub, s.date)
  }
}

// ---- Günlük geçmiş: takvim için gün gün kayıt ----

/** { "2026-07-20": { classic: 3, emoji: 1, quote: 0 } } — değer: kaç tahminde bilindiği; 0 = oynandı ama kaybedildi */
export type DailyHistory = Record<string, Partial<Record<SubMode, number>>>

const DHIST_KEY = 'vt:dhistory'

export function getDailyHistory(): DailyHistory {
  try {
    const raw = localStorage.getItem(DHIST_KEY)
    if (raw) return JSON.parse(raw) as DailyHistory
  } catch { /* yoksay */ }
  return {}
}

function recordDailyWin(sub: SubMode, date: string, guesses: number) {
  const h = getDailyHistory()
  h[date] = { ...h[date], [sub]: guesses }
  localStorage.setItem(DHIST_KEY, JSON.stringify(h))
}

/** Hak bitti, cevap bulunamadı — takvimde ✗ görünsün diye 0 yazılır */
function recordDailyLoss(sub: SubMode, date: string) {
  const h = getDailyHistory()
  // Kazanılmış bir kaydın üzerine yazma (aynı gün aynı mod iki kez bitemez ama garanti olsun)
  if ((h[date]?.[sub] ?? 0) > 0) return
  h[date] = { ...h[date], [sub]: 0 }
  localStorage.setItem(DHIST_KEY, JSON.stringify(h))
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
