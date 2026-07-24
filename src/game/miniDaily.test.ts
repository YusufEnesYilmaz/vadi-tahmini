import { beforeEach, describe, expect, it } from 'vitest'
import { BINGO_DAILY_KEY, WORDLE_DAILY_KEY, miniDailyDone } from './miniDaily'
import { todayKey } from './rng'

const today = () => todayKey()

describe('miniDailyDone', () => {
  beforeEach(() => {
    localStorage.removeItem(WORDLE_DAILY_KEY)
    localStorage.removeItem(BINGO_DAILY_KEY)
  })

  it('kayıt yokken false', () => {
    expect(miniDailyDone('wordle')).toBe(false)
    expect(miniDailyDone('bingo')).toBe(false)
  })

  it('Kelime: bugün + done → true', () => {
    localStorage.setItem(WORDLE_DAILY_KEY, JSON.stringify({ date: today(), guesses: ['AATROX'], done: true }))
    expect(miniDailyDone('wordle')).toBe(true)
  })

  it('Kelime: bugün ama done değil → false (yarım oyun)', () => {
    localStorage.setItem(WORDLE_DAILY_KEY, JSON.stringify({ date: today(), guesses: ['AATROX'], done: false }))
    expect(miniDailyDone('wordle')).toBe(false)
  })

  it('Kelime: done ama farklı tarih → false (dünkü kayıt)', () => {
    localStorage.setItem(WORDLE_DAILY_KEY, JSON.stringify({ date: '2000-01-01', guesses: [], done: true }))
    expect(miniDailyDone('wordle')).toBe(false)
  })

  it('Bingo: bugün + over → true (süre bitti)', () => {
    localStorage.setItem(BINGO_DAILY_KEY, JSON.stringify({ date: today(), filled: 4, won: false, over: true }))
    expect(miniDailyDone('bingo')).toBe(true)
  })

  it('Bingo: bugün + won → true (kart doldu)', () => {
    localStorage.setItem(BINGO_DAILY_KEY, JSON.stringify({ date: today(), filled: 12, won: true, over: false }))
    expect(miniDailyDone('bingo')).toBe(true)
  })

  it('Bingo: başlamış ama bitmemiş (over/won yok) → false', () => {
    localStorage.setItem(BINGO_DAILY_KEY, JSON.stringify({ date: today(), filled: 3, won: false, over: false, started: true }))
    expect(miniDailyDone('bingo')).toBe(false)
  })

  it('bozuk JSON → false, patlamaz', () => {
    localStorage.setItem(WORDLE_DAILY_KEY, '{bozuk')
    expect(miniDailyDone('wordle')).toBe(false)
  })
})
