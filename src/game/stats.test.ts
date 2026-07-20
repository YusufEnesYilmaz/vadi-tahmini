import { describe, expect, it } from 'vitest'
import { getBestScore, getDailyHistory, getDailyStreak, getFullDayStreak, getStats, normalizeEntry, recordGame, recordScore, recordTimedRun, saveDailyState } from './stats'
import { todayKey } from './rng'
import { SUB_MODES } from './types'

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

  it('Günlük kayıp takvim geçmişine g=0 olarak, cevabıyla yazılır', () => {
    const today = todayKey()
    saveDailyState('classic', { date: today, guesses: ['a', 'b', 'c'], done: true, won: false, answer: 'Poppy' })
    const e = normalizeEntry(getDailyHistory()[today]?.classic)
    expect(e?.g).toBe(0) // ✗ kaybedildi
    expect(e?.a).toBe('Poppy') // cevap saklanır — takvimde geçmiş görünsün
  })

  it('Günlük kazanç tahmin sayısıyla yazılır ve kayıp onun üzerine yazmaz', () => {
    const today = todayKey()
    saveDailyState('emoji', { date: today, guesses: ['a'], done: true, won: true, answer: 'Ahri' })
    expect(normalizeEntry(getDailyHistory()[today]?.emoji)?.g).toBe(1)
    // Aynı mod için sonradan gelen kayıp kaydı kazancı ezmemeli
    saveDailyState('emoji', { date: today, guesses: ['a', 'b', 'c'], done: true, won: false })
    const e = normalizeEntry(getDailyHistory()[today]?.emoji)
    expect(e?.g).toBe(1)
    expect(e?.a).toBe('Ahri') // cevap da korunur
  })

  it('ESKİ düz-sayı kayıtları okunmaya devam eder (göç kodu yazılmadı)', () => {
    // Cevap saklama öncesi biçim: { "2026-07-19": { classic: 3 } }
    localStorage.setItem('vt:dhistory', JSON.stringify({ '2026-07-19': { classic: 3, emoji: 0 } }))
    const h = getDailyHistory()
    expect(normalizeEntry(h['2026-07-19']?.classic)).toEqual({ g: 3 }) // kazanılmış, cevabı bilinmiyor
    expect(normalizeEntry(h['2026-07-19']?.emoji)).toEqual({ g: 0 }) // kaybedilmiş
    expect(normalizeEntry(undefined)).toBeUndefined() // oynanmamış
  })

  it('Bitmemiş günlük (done: false) geçmişe yazılmaz', () => {
    const today = todayKey()
    saveDailyState('splash', { date: today, guesses: ['a'], done: false, won: false })
    expect(getDailyHistory()[today]?.splash).toBeUndefined()
  })

  it('Gün serisi kayıpla da ilerler — tamamlamak yeterli, kazanmak şart değil', () => {
    saveDailyState('classic', { date: todayKey(), guesses: ['a', 'b'], done: true, won: false })
    expect(getDailyStreak().streak).toBe(1)
    expect(getDailyStreak().last).toBe(todayKey())
  })

  it('Aynı günün ikinci tamamlaması seriyi tekrar artırmaz', () => {
    const today = todayKey()
    saveDailyState('classic', { date: today, guesses: ['a'], done: true, won: true })
    saveDailyState('emoji', { date: today, guesses: ['a', 'b'], done: true, won: false })
    expect(getDailyStreak().streak).toBe(1)
  })

  it('Bitmemiş günlük seriyi başlatmaz', () => {
    saveDailyState('splash', { date: todayKey(), guesses: ['a'], done: false, won: false })
    expect(getDailyStreak().streak).toBe(0)
  })

  it('Tam Gün serisi TÜM modlar tamamlanınca ilerler — kazanmak şart değil', () => {
    const today = todayKey()
    // Mod listesinden türet: yeni alt mod eklenince test kendiliğinden uyar
    const subs = SUB_MODES.map((m) => m.id)
    for (const sub of subs.slice(0, -1)) {
      saveDailyState(sub, { date: today, guesses: ['a'], done: true, won: true })
    }
    expect(getFullDayStreak().streak).toBe(0) // eksik mod varken sayılmaz
    // Son mod kaybedilerek tamamlansa bile "tamamlandı" sayılır
    saveDailyState(subs.at(-1)!, { date: today, guesses: ['a', 'b'], done: true, won: false })
    expect(getFullDayStreak().streak).toBe(1)
    expect(getFullDayStreak().last).toBe(today)
  })

  it('Tam Gün serisi günde bir kez sayılır ve gevşek seriden bağımsızdır', () => {
    const today = todayKey()
    for (const sub of SUB_MODES.map((m) => m.id)) {
      saveDailyState(sub, { date: today, guesses: ['a'], done: true, won: true })
    }
    // Aynı güne ait tekrar kayıt seriyi iki kez artırmamalı
    saveDailyState('classic', { date: today, guesses: ['a'], done: true, won: true })
    expect(getFullDayStreak().streak).toBe(1)
    expect(getDailyStreak().streak).toBe(1)
  })

  it('Tek mod tamamlamak Tam Gün serisini başlatmaz ama gün serisini ilerletir', () => {
    saveDailyState('classic', { date: todayKey(), guesses: ['a'], done: true, won: true })
    expect(getFullDayStreak().streak).toBe(0)
    expect(getDailyStreak().streak).toBe(1)
  })
})
