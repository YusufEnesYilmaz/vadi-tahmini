import { CHAMPIONS, DATA_VERSION } from './data'
import { godMode } from './dev'
import { TIMELINE_DAILY_KEY, isCurrentMiniDailyRecord } from './miniDaily'
import { fnv1a, seededRng, todayKey } from './rng'
import type { Champion } from './types'
export const TIMELINE_CARDS = 5
export const TIMELINE_MAX_ATTEMPTS = 3

/**
 * Adalet: seçilen 5 yıl arasında ardışık fark en az bu kadar olmalı. "2009 vs 2010"
 * gibi komşu-yıl çiftleri fiilen yazı-tura (kimse tam çıkış yılını bilmez); ≥2 aralık
 * bulmacayı "dönem bilgisi"yle çözülebilir kılar. Sağlanamazsa (nadiren) esner.
 */
export const MIN_YEAR_GAP = 2

/** Sıralı yıllarda tüm ardışık farklar ≥ MIN_YEAR_GAP mi? */
function hasFairSpread(sortedYears: number[]): boolean {
  for (let i = 1; i < sortedYears.length; i++) {
    if (sortedYears[i] - sortedYears[i - 1] < MIN_YEAR_GAP) return false
  }
  return true
}

export interface TimelinePuzzle {
  /** Çıkış yılına göre ESKİDEN YENİYE doğru sıralı hedef 5 şampiyon */
  target: Champion[]
  /** Başlangıçtaki (karışık) 5 şampiyon */
  initial: Champion[]
}

export interface TimelineDailySave {
  date: string
  v?: string
  targetIds: string[]
  currentIds: string[]
  locked: boolean[]
  attempts: number
  over: boolean
  won: boolean
}

/** 5 elemanlı dizide iki elemanın yerini değiştiren saf fonksiyon */
export function swapItems<T>(arr: T[], i: number, j: number): T[] {
  if (i < 0 || i >= arr.length || j < 0 || j >= arr.length || i === j) {
    return [...arr]
  }
  const next = [...arr]
  const tmp = next[i]
  next[i] = next[j]
  next[j] = tmp
  return next
}

/** Pozisyonların doğru sırada olup olmadığını değerlendirir */
export function evaluateOrder(current: Champion[], target: Champion[]): boolean[] {
  return current.map((c, idx) => c.id === target[idx]?.id)
}

/** 5 şampiyonun hepsi farklı yıllarda mı? */
export function validateTimelineYears(champions: Champion[]): boolean {
  if (champions.length !== TIMELINE_CARDS) return false
  const years = champions.map((c) => c.year)
  if (years.some((y) => y === null)) return false
  return new Set(years).size === TIMELINE_CARDS
}

/** Şampiyon havuzundan 5 FARKLI yıla sahip 5 şampiyon ve karışık dizilimi üretir */
function buildPuzzleFromRng(rand: () => number): TimelinePuzzle {
  const validChamps = CHAMPIONS.filter((c) => typeof c.year === 'number')
  
  // Yıllara göre grupla
  const yearMap = new Map<number, Champion[]>()
  for (const c of validChamps) {
    const list = yearMap.get(c.year!) || []
    list.push(c)
    yearMap.set(c.year!, list)
  }

  const allYears = Array.from(yearMap.keys()).sort((a, b) => a - b)
  
  let pickedChamps: Champion[] = []
  let fallback: Champion[] | null = null

  for (let attempt = 0; attempt < 100; attempt++) {
    // 5 farklı yıl seç
    const yearsCopy = [...allYears]
    const selectedYears: number[] = []
    for (let i = 0; i < TIMELINE_CARDS; i++) {
      const idx = Math.floor(rand() * yearsCopy.length)
      selectedYears.push(yearsCopy[idx])
      yearsCopy.splice(idx, 1)
    }
    selectedYears.sort((a, b) => a - b)

    // Her yıldan rastgele bir şampiyon seç
    const champs = selectedYears.map((y) => {
      const pool = yearMap.get(y)!
      return pool[Math.floor(rand() * pool.length)]
    })

    if (!validateTimelineYears(champs)) continue
    if (!fallback) fallback = champs // ilk geçerli aday — adil aralık bulunamazsa buna dönülür
    if (hasFairSpread(selectedYears)) { pickedChamps = champs; break }
  }
  // Adil aralık çıkmadıysa (nadiren) ilk geçerli adaya düş — oyun durmaz
  if (pickedChamps.length === 0) pickedChamps = fallback ?? []

  const target = [...pickedChamps].sort((a, b) => a.year! - b.year!)

  // Karıştır - başlangıç dizilimi hedefle aynı olmasın
  let initial = [...target]
  let shuffleAttempts = 0
  while (shuffleAttempts < 20) {
    shuffleAttempts++
    // Fisher yates with custom rand
    for (let i = initial.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[initial[i], initial[j]] = [initial[j], initial[i]]
    }
    // Değerlendir: Hele ki hepsi tam aynı olmasın
    const same = initial.every((c, idx) => c.id === target[idx].id)
    if (!same) break
  }

  return { target, initial }
}

/** Günlük Zaman Tüneli bulmacası (Deterministik) */
export function dailyTimeline(): TimelinePuzzle {
  const seed = fnv1a(`${todayKey()}:timeline`)
  const rand = seededRng(seed)
  return buildPuzzleFromRng(rand)
}

/**
 * Sınırsız Zaman Tüneli bulmacası. `avoidIds` = bir önceki turun şampiyonları:
 * yeni aday onlarla KESİŞMEMELİ ("Tekrar Oyna" aynı isimleri getirmesin).
 * 10 denemede temiz aday çıkmazsa kural esner, son aday döner (oyun durmaz —
 * deste `avoid` kuralındaki ilke).
 */
export function randomTimeline(avoidIds?: string[]): TimelinePuzzle {
  let candidate = buildPuzzleFromRng(() => Math.random())
  if (!avoidIds?.length) return candidate
  for (let i = 0; i < 10 && candidate.target.some((c) => avoidIds.includes(c.id)); i++) {
    candidate = buildPuzzleFromRng(() => Math.random())
  }
  return candidate
}

/** Günlük durumu yükler (God Mode açıksa null döner) */
export function loadDailyTimeline(): TimelineDailySave | null {
  if (godMode()) return null
  try {
    const raw = localStorage.getItem(TIMELINE_DAILY_KEY)
    if (!raw) return null
    const save = JSON.parse(raw) as TimelineDailySave
    if (!isCurrentMiniDailyRecord(save, DATA_VERSION)) return null
    return save
  } catch {
    return null
  }
}

/** Günlük durumu kaydeder */
export function saveDailyTimeline(save: TimelineDailySave): void {
  try {
    localStorage.setItem(TIMELINE_DAILY_KEY, JSON.stringify({ ...save, v: DATA_VERSION }))
  } catch {
    // localStorage kapalı olabilir
  }
}

/** Galibiyet sayacı + en az deneme rekoru — rozetler okur (recordWordleWin kalıbı) */
export function recordTimelineWin(attempts: number) {
  localStorage.setItem('vt:timeline:wins', String(Number(localStorage.getItem('vt:timeline:wins') ?? 0) + 1))
  const best = Number(localStorage.getItem('vt:timeline:best') ?? 99)
  if (attempts < best) localStorage.setItem('vt:timeline:best', String(attempts))
}
