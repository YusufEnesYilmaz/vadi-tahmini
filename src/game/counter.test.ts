import { describe, expect, it } from 'vitest'
import { allChallenges, buildChallenges, isInChallenge, randomChallenge } from './counter'
import { CHAMPIONS } from './data'

describe('counter — Kaç Tane? ölçütleri', () => {
  it('ölçüt havuzu boş değil', () => {
    expect(buildChallenges().length).toBeGreaterThan(0)
  })

  it('her ölçütün cevap kümesi makul boyutta (4–30) ve tekrarsız', () => {
    for (const ch of allChallenges()) {
      expect(ch.ids.length).toBeGreaterThanOrEqual(4)
      expect(ch.ids.length).toBeLessThanOrEqual(30)
      expect(new Set(ch.ids).size).toBe(ch.ids.length) // aynı şampiyon iki kez sayılmaz
      expect(ch.label.length).toBeGreaterThan(0)
    }
  })

  /*
   * Kullanıcı kararı: ölçütler TEKLİ olacak ("Zaun"), ikili AND birleşimi
   * ("Canavar + Yakın dövüş") olmayacak — soru kafada anında canlansın.
   */
  it('ölçütler tekli — birleşik ("A + B") etiket üretilmez', () => {
    for (const ch of allChallenges()) expect(ch.label).not.toContain(' + ')
  })

  it('isInChallenge: cevap kümesindeki id true, dışındaki false', () => {
    const ch = allChallenges()[0]
    expect(isInChallenge(ch, ch.ids[0])).toBe(true)
    // Cevap kümesinde OLMAYAN gerçek bir şampiyon → yanlış sayılmalı
    const outsider = CHAMPIONS.find((c) => !ch.ids.includes(c.id))!
    expect(isInChallenge(ch, outsider.id)).toBe(false)
    expect(isInChallenge(ch, 'zzzxxqq_yok')).toBe(false)
    expect(isInChallenge(ch, '')).toBe(false)
  })

  it('randomChallenge: verilen etiketi tekrar etmez (havuz > 1)', () => {
    const a = allChallenges()[0]
    for (let i = 0; i < 20; i++) {
      expect(randomChallenge(a.label).label).not.toBe(a.label)
    }
  })
})
