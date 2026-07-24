import { beforeEach, describe, expect, it } from 'vitest'
import {
  HUNT_ALPHABET,
  HUNT_HINT_TIERS,
  HUNT_MAX_ATTEMPTS,
  dailyHuntTarget,
  evaluateHuntGuess,
  huntHintText,
  huntIndexOf,
  huntOrder,
  lettersInRange,
  loadDailyHunt,
  narrowRange,
  randomHuntTarget,
  saveDailyHunt,
} from './hunt'
import { CHAMPIONS, byId } from './data'
import { HUNT_DAILY_KEY, miniDailyDone } from './miniDaily'
import { todayKey } from './rng'
import { toLetters } from './wordle'

describe('hunt — alfabetik sıralama', () => {
  it('liste tüm şampiyonları içerir ve toLetters sırasına göre kararlıdır', () => {
    const order = huntOrder()
    expect(order).toHaveLength(CHAMPIONS.length)
    for (let i = 1; i < order.length; i++) {
      // Yerelsiz karşılaştırma: normalize ad artan sırada olmalı
      expect(toLetters(order[i - 1].name) <= toLetters(order[i].name)).toBe(true)
    }
  })

  it("kesme işaretli adlar normalize sıralanır (Kai'Sa → KAISA)", () => {
    // KAISA, KALISTA'dan önce gelir (I < L) — kesme işareti sıralamayı bozmamalı
    expect(huntIndexOf('Kaisa')).toBeLessThan(huntIndexOf('Kalista'))
    // ChoGath, CAMILLE'den sonra (H > A)
    expect(huntIndexOf('Chogath')).toBeGreaterThan(huntIndexOf('Camille'))
  })
})

describe('hunt — mesafe ve yön', () => {
  it('mesafe = indeks farkı, yön hedefin tarafını söyler', () => {
    const order = huntOrder()
    const target = order[50]
    const guess = order[45]
    const fb = evaluateHuntGuess(target.id, guess.id)
    expect(fb.distance).toBe(5)
    expect(fb.dir).toBe('after') // hedef, tahminden SONRA
    const fb2 = evaluateHuntGuess(target.id, order[60].id)
    expect(fb2.distance).toBe(10)
    expect(fb2.dir).toBe('before')
  })

  it('doğru tahmin: mesafe 0 + correct', () => {
    const c = huntOrder()[10]
    expect(evaluateHuntGuess(c.id, c.id)).toEqual({ distance: 0, dir: 'correct' })
  })
})

describe('hunt — aralık daraltma (A–Z şeridi)', () => {
  it('her tahmin aralığı hedefi içerecek şekilde daraltır', () => {
    const order = huntOrder()
    const target = order[80]
    const [lo1, hi1] = narrowRange(target.id, [order[40].id])
    expect(lo1).toBe(41)
    expect(hi1).toBe(order.length - 1)
    const [lo2, hi2] = narrowRange(target.id, [order[40].id, order[120].id])
    expect(lo2).toBe(41)
    expect(hi2).toBe(119)
    // Hedef hep aralığın içinde
    expect(huntIndexOf(target.id)).toBeGreaterThanOrEqual(lo2)
    expect(huntIndexOf(target.id)).toBeLessThanOrEqual(hi2)
  })

  it('aralık dışı baş harfler söner', () => {
    const order = huntOrder()
    // Aralığı son 10 şampiyona indir → A harfi artık mümkün olmamalı
    const letters = lettersInRange(order.length - 10, order.length - 1)
    expect(letters.has('A')).toBe(false)
    expect(HUNT_ALPHABET.length).toBeGreaterThan(15) // şerit veriden doldu
  })
})

describe('hunt — üretim + günlük', () => {
  beforeEach(() => localStorage.removeItem(HUNT_DAILY_KEY))

  it('günlük hedef deterministik, sınırsız avoid çalışır', () => {
    expect(dailyHuntTarget().id).toBe(dailyHuntTarget().id)
    // avoid + 10 iç deneme → aynı id'nin dönme olasılığı (1/173)^11, fiilen sıfır
    const avoid = randomHuntTarget().id
    expect(randomHuntTarget(avoid).id).not.toBe(avoid)
  })

  it('günlük kayıt gidiş-dönüşü + menü "bitti" tespiti', () => {
    expect(loadDailyHunt()).toBeNull()
    saveDailyHunt({ date: todayKey(), targetId: 'Ahri', guessIds: ['Garen'], over: false, won: false })
    expect(loadDailyHunt()?.guessIds).toEqual(['Garen'])
    expect(miniDailyDone('hunt')).toBe(false) // bitmedi
    saveDailyHunt({ date: todayKey(), targetId: 'Ahri', guessIds: ['Garen', 'Ahri'], over: true, won: true })
    expect(miniDailyDone('hunt')).toBe(true)
    // Eski tarihli kayıt yok sayılır
    saveDailyHunt({ date: '2020-01-01', targetId: 'Ahri', guessIds: [], over: true, won: true })
    expect(loadDailyHunt()).toBeNull()
    expect(miniDailyDone('hunt')).toBe(false)
  })

  it('sabitler mantıklı: 8 deneme (log2 173 ≈ 7.4 sınırı)', () => {
    expect(HUNT_MAX_ATTEMPTS).toBe(8)
  })

  it('istek üzerine ipucu kademeleri: 0=yok, 1=bölge, 2=+rol, 3=+tür', () => {
    const c = byId('Darius')!
    expect(huntHintText(c, 0)).toBeNull()
    // 1: yalnız bölge
    expect(huntHintText(c, 1)).toContain(c.region)
    expect(huntHintText(c, 1)).not.toContain(c.roles[0])
    expect(huntHintText(c, 1)).not.toContain(c.species)
    // 2: bölge + rol, henüz tür yok
    expect(huntHintText(c, 2)).toContain(c.region)
    expect(huntHintText(c, 2)).toContain(c.roles[0])
    expect(huntHintText(c, 2)).not.toContain(c.species)
    // 3: üçü de
    expect(huntHintText(c, 3)).toContain(c.region)
    expect(huntHintText(c, 3)).toContain(c.roles[0])
    expect(huntHintText(c, 3)).toContain(c.species)
    expect(HUNT_HINT_TIERS).toBe(3)
  })
})
