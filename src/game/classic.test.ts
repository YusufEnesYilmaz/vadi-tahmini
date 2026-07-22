import { describe, expect, it } from 'vitest'
import { evaluateGuess } from './classic'
import type { Champion } from './types'
import { CHAMPIONS } from './data'

function champ(over: Partial<Champion>): Champion {
  return {
    id: 'X', key: 1, name: 'X', title: '', roles: [], lanes: ['Orta'], species: 'İnsan',
    resource: 'Mana', rangeType: 'Menzilli', region: 'Zaun', gender: 'Kadın',
    year: 2013, skins: [], spells: [], passive: { name: '', img: '' },
    ...over,
  }
}

const target = champ({ id: 'target', lanes: ['Orta', 'Alt'], year: 2013 })

describe('klasik tablo değerlendirmesi', () => {
  it('birebir aynı özellik yeşil olur', () => {
    const r = evaluateGuess(champ({ lanes: ['Orta', 'Alt'] }), target)
    expect(r.cells.lanes).toBe('correct')
    expect(r.cells.region).toBe('correct')
  })

  it('kesişen ama aynı olmayan liste kısmi olur', () => {
    const r = evaluateGuess(champ({ lanes: ['Orta'] }), target)
    expect(r.cells.lanes).toBe('partial')
  })

  it('Aşırı Zor: kısmi eşleşme gizlenir, yanlış gibi görünür', () => {
    const r = evaluateGuess(champ({ lanes: ['Orta'] }), target, false)
    expect(r.cells.lanes).toBe('wrong')
    // Doğru olanlar gizlenmemeli, yoksa oyun çözülemez hale gelir
    expect(r.cells.region).toBe('correct')
  })

  it('yıl oku hedefin daha eski mi yeni mi olduğunu söyler', () => {
    expect(evaluateGuess(champ({ year: 2020 }), target).yearHint).toBe('earlier')
    expect(evaluateGuess(champ({ year: 2010 }), target).yearHint).toBe('later')
    expect(evaluateGuess(champ({ year: 2013 }), target).yearHint).toBe('equal')
  })

  it('alakasız şampiyon her hücrede yanlış verir', () => {
    const r = evaluateGuess(
      champ({ lanes: ['Orman'], region: 'Demacia', gender: 'Erkek', species: 'Yordle', resource: 'Kaynaksız', rangeType: 'Yakın Dövüş', year: 2009 }),
      target,
    )
    expect(Object.values(r.cells).every((c) => c === 'wrong')).toBe(true)
  })
})

describe('tür sütunu', () => {
  it('her şampiyonun türü var ve geçerli kategoriden', () => {
    const gecerli = new Set(['İnsan', 'Yordle', 'Vastaya', 'Boşluk', 'Darkin', 'İblis', 'Ruh', 'Semavi',
      'Yükselmiş', 'Makine', 'Siborg', 'Canavar', 'Ölümsüz', 'Ejderha', 'Bitki', 'Element', 'Bilinmiyor'])
    const bozuk = CHAMPIONS.filter((c) => !c.species || !gecerli.has(c.species)).map((c) => `${c.name}=${c.species}`)
    expect(bozuk, `geçersiz tür: ${bozuk.join(', ')}`).toEqual([])
  })

  it('tür sütunu tam eşleşme mantığıyla değerlendirilir', () => {
    const a = champ({ species: 'Yordle' })
    expect(evaluateGuess(a, champ({ species: 'Yordle' })).cells.species).toBe('correct')
    expect(evaluateGuess(a, champ({ species: 'Vastaya' })).cells.species).toBe('wrong')
  })

  it('tek bir tür havuzun yarısından fazlasını kaplamıyor (ipucu değeri kalsın)', () => {
    const say = new Map<string, number>()
    for (const c of CHAMPIONS) say.set(c.species, (say.get(c.species) ?? 0) + 1)
    const enBuyuk = Math.max(...say.values())
    expect(enBuyuk / CHAMPIONS.length).toBeLessThan(0.5)
  })
})
