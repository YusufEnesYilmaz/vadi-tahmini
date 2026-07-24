import { describe, expect, it } from 'vitest'
import {
  dailyTimeline,
  evaluateOrder,
  randomTimeline,
  swapItems,
  validateTimelineYears,
} from './timeline'
import { byId } from './data'

describe('timeline.ts', () => {
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
})
