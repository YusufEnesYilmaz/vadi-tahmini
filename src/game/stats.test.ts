import { describe, expect, it } from 'vitest'
import { getBestScore, getDailyHistory, getStats, recordGame, recordScore, recordTimedRun, saveDailyState } from './stats'
import { todayKey } from './rng'

describe('istatistikler', () => {
  it('kazanılan oyun seriyi ve dağılımı günceller', () => {
    recordGame('endless', 'classic', 'normal', true, 3)
    const s = getStats('endless', 'classic', 'normal')
    expect(s.played).toBe(1)
    expect(s.won).toBe(1)
    expect(s.currentStreak).toBe(1)
    expect(s.dist[2]).toBe(1) // 3 tahmin → 3. kutu
    expect(s.firstTry).toBe(0)
  })

  it('tek tahminde bilme ayrı sayılır ve serisi tutulur', () => {
    recordGame('endless', 'emoji', 'normal', true, 1)
    recordGame('endless', 'emoji', 'normal', true, 1)
    const s = getStats('endless', 'emoji', 'normal')
    expect(s.firstTry).toBe(2)
    expect(s.firstTryStreak).toBe(2)
    expect(s.bestFirstTryStreak).toBe(2)
  })

  it('kayıp oyun serileri sıfırlar ama oynanana yazılır', () => {
    recordGame('endless', 'classic', 'normal', true, 1)
    recordGame('endless', 'classic', 'normal', false, 8)
    const s = getStats('endless', 'classic', 'normal')
    expect(s.played).toBe(2)
    expect(s.won).toBe(1)
    expect(s.currentStreak).toBe(0)
    expect(s.firstTryStreak).toBe(0)
    expect(s.bestFirstTryStreak).toBe(1) // rekor korunmalı
  })

  it('6+ tahmin son kutuda toplanır', () => {
    recordGame('endless', 'skin', 'easy', true, 9)
    expect(getStats('endless', 'skin', 'easy').dist.at(-1)).toBe(1)
  })

  it('zorluklar birbirinin istatistiğine karışmaz', () => {
    recordGame('endless', 'classic', 'hard', true, 2)
    expect(getStats('endless', 'classic', 'hard').played).toBe(1)
    expect(getStats('endless', 'classic', 'easy').played).toBe(0)
  })

  it('Günlük istatistiği zorluktan bağımsız tek yerde tutulur', () => {
    recordGame('daily', 'classic', 'normal', true, 2)
    // Günlük'te zorluk seçilemiyor; hangi zorlukla sorulursa sorulsun aynı kayıt
    expect(getStats('daily', 'classic', 'insane').played).toBe(1)
  })

  it('Zamana Karşı turu ve rekoru kaydedilir', () => {
    recordTimedRun('quote', 'normal', 5)
    recordTimedRun('quote', 'normal', 9)
    const s = getStats('timed', 'quote', 'normal')
    expect(s.played).toBe(2)
    expect(s.totalScore).toBe(14) // ortalama skor buradan hesaplanıyor

    expect(recordScore('quote', 'normal', 9)).toBe(true)
    expect(recordScore('quote', 'normal', 4)).toBe(false) // düşük skor rekoru bozmaz
    expect(getBestScore('quote', 'normal')).toBe(9)
  })

  it('Günlük kayıp takvim geçmişine 0 olarak yazılır', () => {
    const today = todayKey()
    saveDailyState('classic', { date: today, guesses: ['a', 'b', 'c'], done: true, won: false })
    expect(getDailyHistory()[today]?.classic).toBe(0) // ✗ kaybedildi
  })

  it('Günlük kazanç tahmin sayısıyla yazılır ve kayıp onun üzerine yazmaz', () => {
    const today = todayKey()
    saveDailyState('emoji', { date: today, guesses: ['a'], done: true, won: true })
    expect(getDailyHistory()[today]?.emoji).toBe(1)
    // Aynı mod için sonradan gelen kayıp kaydı kazancı ezmemeli
    saveDailyState('emoji', { date: today, guesses: ['a', 'b', 'c'], done: true, won: false })
    expect(getDailyHistory()[today]?.emoji).toBe(1)
  })

  it('Bitmemiş günlük (done: false) geçmişe yazılmaz', () => {
    const today = todayKey()
    saveDailyState('splash', { date: today, guesses: ['a'], done: false, won: false })
    expect(getDailyHistory()[today]?.splash).toBeUndefined()
  })
})
