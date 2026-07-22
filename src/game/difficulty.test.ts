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
    for (const key of ['abilityNameAt', 'skinChampionAt', 'quoteSecondAt', 'quoteThirdAt'] as const) {
      const vals = ORDER.map((d) => at(RULES[d][key]))
      expect(vals).toEqual([...vals].sort((a, b) => a - b))
    }
  })

  it('Eşya ipuçları zorlaştıkça geç gelir; ikon her zaman en son ipucudur', () => {
    const at = (v: number | null) => (v === null ? Infinity : v)
    for (const key of ['itemTagsAt', 'itemPartsAt', 'itemIconAt'] as const) {
      const vals = ORDER.map((d) => at(RULES[d][key]))
      expect(vals, key).toEqual([...vals].sort((a, b) => a - b))
    }
    // Mod ters: ikon soru değil ödül — statlardan önce açılmamalı
    for (const d of ORDER) {
      expect(at(RULES[d].itemIconAt), d).toBeGreaterThanOrEqual(at(RULES[d].itemTagsAt))
    }
  })

  it('silüet zorlaştıkça daha yavaş aydınlanır', () => {
    const steps = ORDER.map((d) => RULES[d].silhouetteReveals)
    expect(steps).toEqual([...steps].sort((a, b) => a - b))
    expect(Math.min(...steps)).toBeGreaterThan(0) // sıfır olursa görsel hiç açılmaz
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
