import { describe, expect, it } from 'vitest'
import { SUMMONER_TITLES, titleFor, nextTitle } from './rank'

describe('LoL rank ligleri (en iyi gün serisi)', () => {
  it('eşikler kesin ARTAN ve ilki 0', () => {
    expect(SUMMONER_TITLES[0].min).toBe(0)
    for (let i = 1; i < SUMMONER_TITLES.length; i++) {
      expect(SUMMONER_TITLES[i].min).toBeGreaterThan(SUMMONER_TITLES[i - 1].min)
    }
  })

  it('ıvır zıvır ödül yok: ilk gerçek lig 3 günlük seride', () => {
    // 1-2 günlük seri hâlâ Demir; lig atlamak için 3 gün gerekiyor
    expect(titleFor(1).title).toBe('Demir')
    expect(titleFor(2).title).toBe('Demir')
    expect(titleFor(3).title).toBe('Bronz')
  })

  it('sınır değerleri doğru ligi verir', () => {
    expect(titleFor(0).title).toBe('Demir')
    expect(titleFor(6).title).toBe('Bronz')
    expect(titleFor(7).title).toBe('Gümüş')
    expect(titleFor(11).title).toBe('Gümüş')
    expect(titleFor(12).title).toBe('Altın')
    expect(titleFor(19).title).toBe('Altın')
    expect(titleFor(20).title).toBe('Platin')
    expect(titleFor(29).title).toBe('Platin')
    expect(titleFor(30).title).toBe('Zümrüt')
    expect(titleFor(44).title).toBe('Zümrüt')
    expect(titleFor(45).title).toBe('Elmas')
    expect(titleFor(64).title).toBe('Elmas')
    expect(titleFor(65).title).toBe('Usta')
    expect(titleFor(89).title).toBe('Usta')
    expect(titleFor(90).title).toBe('Büyük Usta')
    expect(titleFor(119).title).toBe('Büyük Usta')
    expect(titleFor(120).title).toBe('Şampiyon')
    expect(titleFor(999).title).toBe('Şampiyon')
  })

  it('nextTitle bir sonrakini verir, zirvede null', () => {
    expect(nextTitle(0)?.title).toBe('Bronz')
    expect(nextTitle(2)?.title).toBe('Bronz')
    expect(nextTitle(3)?.title).toBe('Gümüş')
    expect(nextTitle(119)?.title).toBe('Şampiyon')
    expect(nextTitle(120)).toBeNull()
    expect(nextTitle(999)).toBeNull()
  })
})
