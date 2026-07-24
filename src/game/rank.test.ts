import { describe, expect, it } from 'vitest'
import { SUMMONER_TITLES, titleFor, nextTitle } from './rank'

describe('sihirdar unvanı kademeleri (en iyi gün serisi)', () => {
  it('eşikler kesin ARTAN ve ilki 0', () => {
    expect(SUMMONER_TITLES[0].min).toBe(0)
    for (let i = 1; i < SUMMONER_TITLES.length; i++) {
      expect(SUMMONER_TITLES[i].min).toBeGreaterThan(SUMMONER_TITLES[i - 1].min)
    }
  })

  it('ıvır zıvır ödül yok: ilk gerçek unvan 3 günlük seride', () => {
    // 1-2 günlük seri hâlâ başlangıç unvanı; unvan atlamak için 3 gün gerekiyor
    expect(titleFor(1).title).toBe('Sihirdar Çırağı')
    expect(titleFor(2).title).toBe('Sihirdar Çırağı')
    expect(titleFor(3).title).toBe('Vadi Savaşçısı')
  })

  it('sınır değerleri doğru unvanı verir', () => {
    expect(titleFor(0).title).toBe('Sihirdar Çırağı')
    expect(titleFor(6).title).toBe('Vadi Savaşçısı')
    expect(titleFor(7).title).toBe('Demacia Muhafızı')
    expect(titleFor(13).title).toBe('Demacia Muhafızı')
    expect(titleFor(14).title).toBe('Kıdemli Avcı')
    expect(titleFor(30).title).toBe('Ionia Bilgesi')
    expect(titleFor(59).title).toBe('Ionia Bilgesi')
    expect(titleFor(60).title).toBe('Usta Sihirdar')
    expect(titleFor(99).title).toBe('Usta Sihirdar')
    expect(titleFor(100).title).toBe('Runeterra Efsanesi')
    expect(titleFor(999).title).toBe('Runeterra Efsanesi')
  })

  it('nextTitle bir sonrakini verir, zirvede null', () => {
    expect(nextTitle(0)?.title).toBe('Vadi Savaşçısı')
    expect(nextTitle(2)?.title).toBe('Vadi Savaşçısı')
    expect(nextTitle(3)?.title).toBe('Demacia Muhafızı')
    expect(nextTitle(99)?.title).toBe('Runeterra Efsanesi')
    expect(nextTitle(100)).toBeNull()
    expect(nextTitle(999)).toBeNull()
  })
})
