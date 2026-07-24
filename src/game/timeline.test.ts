import { beforeEach, describe, expect, it } from 'vitest'
import {
  MIN_YEAR_GAP,
  dailyTimeline,
  evaluateOrder,
  loadDailyTimeline,
  randomTimeline,
  saveDailyTimeline,
  swapItems,
  validateTimelineYears,
} from './timeline'
import { byId } from './data'
import { TIMELINE_DAILY_KEY } from './miniDaily'
import { todayKey } from './rng'

describe('timeline.ts', () => {
  beforeEach(() => localStorage.removeItem(TIMELINE_DAILY_KEY))

  it('5 şampiyonun 5 farklı çıkış yılı olduğunu doğrular', () => {
    const puzzle = dailyTimeline()
    expect(puzzle.target).toHaveLength(5)
    expect(puzzle.initial).toHaveLength(5)
    expect(validateTimelineYears(puzzle.target)).toBe(true)
    
    // Hedef liste çıkış yılına göre küçükten büyüğe sıralı olmalı
    for (let i = 0; i < puzzle.target.length - 1; i++) {
      expect(puzzle.target[i].year!).toBeLessThan(puzzle.target[i + 1].year!)
    }
  })

  it('swapItems elemanların yerini doğru değiştirir', () => {
    const arr = ['A', 'B', 'C', 'D', 'E']
    const swapped = swapItems(arr, 1, 3)
    expect(swapped).toEqual(['A', 'D', 'C', 'B', 'E'])
    expect(arr).toEqual(['A', 'B', 'C', 'D', 'E']) // Saf fonksiyon

    // Geçersiz indekslerde değiştirmeden kopyalar
    expect(swapItems(arr, -1, 2)).toEqual(arr)
    expect(swapItems(arr, 1, 10)).toEqual(arr)
    expect(swapItems(arr, 2, 2)).toEqual(arr)
  })

  it('evaluateOrder doğru kilit durumunu döner', () => {
    const a = byId('Aatrox')!
    const b = byId('Ahri')!
    const c = byId('Akali')!
    const d = byId('Alistar')!
    const e = byId('Amumu')!

    const target = [a, b, c, d, e]
    const current = [a, c, b, d, e]

    const locked = evaluateOrder(current, target)
    expect(locked).toEqual([true, false, false, true, true])
  })

  it('dailyTimeline deterministiktir', () => {
    const p1 = dailyTimeline()
    const p2 = dailyTimeline()
    expect(p1.target.map((c) => c.id)).toEqual(p2.target.map((c) => c.id))
    expect(p1.initial.map((c) => c.id)).toEqual(p2.initial.map((c) => c.id))
  })

  it('randomTimeline geçerli bulmaca üretir', () => {
    const puzzle = randomTimeline()
    expect(puzzle.target).toHaveLength(5)
    expect(validateTimelineYears(puzzle.target)).toBe(true)
  })

  /*
   * Adalet (2026-07-24 içerik turu): komşu yıllar (2009 vs 2010) fiilen yazı-tura,
   * kimse tam çıkış yılını bilmez. Seçilen yıllar arasında en az MIN_YEAR_GAP
   * aralık olması bulmacayı "dönem bilgisi"yle çözülebilir kılıyor. 18 farklı yıl
   * havuzunda bu her zaman sağlanabiliyor; sağlanamazsa üretici esner (oyun durmaz).
   */
  it('seçilen yıllar arasında en az MIN_YEAR_GAP aralık var', () => {
    for (const puzzle of [dailyTimeline(), ...Array.from({ length: 20 }, () => randomTimeline())]) {
      const years = puzzle.target.map((c) => c.year!)
      for (let i = 1; i < years.length; i++) {
        expect(years[i] - years[i - 1], `${years.join(',')}`).toBeGreaterThanOrEqual(MIN_YEAR_GAP)
      }
    }
  })

  it('farklı veri sürümü kaydı atılır, eski v’siz kayıt çalışır', () => {
    const puzzle = dailyTimeline()
    localStorage.setItem(TIMELINE_DAILY_KEY, JSON.stringify({
      date: todayKey(),
      v: 'eski',
      targetIds: puzzle.target.map((c) => c.id),
      currentIds: puzzle.initial.map((c) => c.id),
      locked: [false, false, false, false, false],
      attempts: 0,
      over: false,
      won: false,
    }))
    expect(loadDailyTimeline()).toBeNull()

    saveDailyTimeline({
      date: todayKey(),
      targetIds: puzzle.target.map((c) => c.id),
      currentIds: puzzle.initial.map((c) => c.id),
      locked: [false, false, false, false, false],
      attempts: 1,
      over: false,
      won: false,
    })
    expect(loadDailyTimeline()?.attempts).toBe(1)
  })
})
