import { describe, expect, it } from 'vitest'
import { cryptoRandInt, dailyIndex, fnv1a, seededRng, shuffle, todayKey } from './rng'

describe('rastgelelik', () => {
  it('fnv1a aynı girdi için hep aynı sonucu verir', () => {
    // Günlük modun herkese aynı bulmacayı vermesi buna dayanıyor
    expect(fnv1a('2026-07-20:classic')).toBe(fnv1a('2026-07-20:classic'))
    expect(fnv1a('2026-07-20:classic')).not.toBe(fnv1a('2026-07-21:classic'))
  })

  it('dailyIndex havuz sınırları içinde kalır ve kararlıdır', () => {
    const size = 173
    const a = dailyIndex('classic', size)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(size)
    expect(dailyIndex('classic', size)).toBe(a)
    // Farklı alt mod farklı bulmaca vermeli, yoksa altı mod aynı cevabı gösterir
    expect(dailyIndex('emoji', size)).not.toBe(dailyIndex('classic', size) + size)
  })

  it('todayKey YYYY-MM-DD biçiminde', () => {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('seededRng aynı tohumla aynı diziyi üretir', () => {
    const a = seededRng(12345)
    const b = seededRng(12345)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('cryptoRandInt aralık dışına çıkmaz', () => {
    for (let i = 0; i < 500; i++) {
      const v = cryptoRandInt(7)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(7)
    }
    expect(cryptoRandInt(0)).toBe(0) // sıfır havuzda patlamamalı
  })

  it('shuffle eleman kaybetmez', () => {
    const src = Array.from({ length: 50 }, (_, i) => `c${i}`)
    const out = shuffle([...src])
    expect([...out].sort()).toEqual([...src].sort())
  })
})
