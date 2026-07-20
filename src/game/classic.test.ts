import { describe, expect, it } from 'vitest'
import { evaluateGuess } from './classic'
import type { Champion } from './types'

function champ(over: Partial<Champion>): Champion {
  return {
    id: 'X', key: 1, name: 'X', title: '', roles: [], lanes: ['Orta'],
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
      champ({ lanes: ['Orman'], region: 'Demacia', gender: 'Erkek', resource: 'Kaynaksız', rangeType: 'Yakın Dövüş', year: 2009 }),
      target,
    )
    expect(Object.values(r.cells).every((c) => c === 'wrong')).toBe(true)
  })
})
