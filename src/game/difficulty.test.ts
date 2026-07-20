import { describe, expect, it } from 'vitest'
import { RULES, rulesFor } from './difficulty'
import { DIFFICULTIES } from './types'

const ORDER = ['easy', 'normal', 'hard', 'insane'] as const

describe('zorluk kuralları', () => {
  it('Günlük her zaman normal kuralları kullanır', () => {
    // Herkes aynı bulmacayı aynı ipuçlarıyla çözmeli, yoksa paylaşılan skor anlamsız
    for (const d of DIFFICULTIES) {
      expect(rulesFor('daily', d.id)).toEqual(RULES.normal)
    }
    expect(rulesFor('endless', 'insane')).toEqual(RULES.insane)
  })

  it('zorluk arttıkça tahmin hakkı azalır', () => {
    const limits = ORDER.map((d) => RULES[d].maxGuesses)
    expect(limits).toEqual([...limits].sort((a, b) => b - a))
    expect(new Set(limits).size).toBe(limits.length) // hepsi farklı olmalı
  })

  it('zorluk arttıkça süre kısalır', () => {
    const secs = ORDER.map((d) => RULES[d].timedSeconds)
    expect(secs).toEqual([...secs].sort((a, b) => b - a))
  })

  it('zorluk arttıkça ipuçları geç gelir ya da hiç gelmez', () => {
    const at = (v: number | null) => (v === null ? Infinity : v)
    for (const key of ['abilityNameAt', 'skinChampionAt', 'quoteSecondAt'] as const) {
      const vals = ORDER.map((d) => at(RULES[d][key]))
      expect(vals).toEqual([...vals].sort((a, b) => a - b))
    }
  })

  it('görsel zorlaştıkça daha yakından başlar', () => {
    const zooms = ORDER.map((d) => RULES[d].zoomStart)
    expect(zooms).toEqual([...zooms].sort((a, b) => a - b))
  })

  it('yalnız Aşırı Zor kısmi eşleşmeyi gizler', () => {
    expect(RULES.insane.showPartial).toBe(false)
    expect(RULES.easy.showPartial && RULES.normal.showPartial && RULES.hard.showPartial).toBe(true)
  })
})
