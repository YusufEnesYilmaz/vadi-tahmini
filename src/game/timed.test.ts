import { describe, expect, it } from 'vitest'
import { getTimedSecondsLeft } from './timed'

describe('timed wall-clock helper', () => {
  it('bir saniye dolmadan süreyi düşürmez', () => {
    expect(getTimedSecondsLeft(1_000, 60, 1_999)).toBe(60)
  })

  it('tam saniyelerde kalan süreyi düşürür', () => {
    expect(getTimedSecondsLeft(1_000, 60, 2_000)).toBe(59)
    expect(getTimedSecondsLeft(1_000, 60, 61_000)).toBe(0)
  })

  it('başlangıç öncesi ve taşma durumlarını güvenle sıkıştırır', () => {
    expect(getTimedSecondsLeft(5_000, 45, 4_000)).toBe(45)
    expect(getTimedSecondsLeft(5_000, 45, 99_000)).toBe(0)
  })

  it('duraklatılan süreyi oyun süresinden düşer', () => {
    expect(getTimedSecondsLeft(1_000, 60, 21_000, { pausedMs: 10_000 })).toBe(50)
  })

  it('ceza saniyelerini ayrıca düşer', () => {
    expect(getTimedSecondsLeft(1_000, 60, 6_000, { penaltySeconds: 10 })).toBe(45)
  })
})
