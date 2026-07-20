import { describe, expect, it } from 'vitest'
import { CHAMPIONS, EMOJI_IDS } from './data'
import {
  ALL_FILTER, filterKey, matches, parseFilterKey, poolCount, pooledIds,
  regionOptions, roleOptions, laneOptions, type PoolFilter,
} from './filter'
import { createTimedStream, nextPuzzle } from './puzzle'
import { champOf } from '../test/helpers'

describe('havuz filtresi', () => {
  it('anahtar gidiş-dönüş korunur', () => {
    const cases: PoolFilter[] = [
      ALL_FILTER,
      { kind: 'region', value: 'Noxus' },
      { kind: 'role', value: 'Suikastçı' },
      { kind: 'lane', value: 'Orman' },
    ]
    for (const f of cases) expect(parseFilterKey(filterKey(f))).toEqual(f)
  })

  it('bozuk/bilinmeyen anahtar güvenle "tümü" olur', () => {
    for (const bad of ['', 'saçma', 'kind:', 'olmayan:Noxus', null, undefined]) {
      expect(parseFilterKey(bad)).toEqual(ALL_FILTER)
    }
  })

  it('seçenekler veriden türer ve boş değildir', () => {
    expect(regionOptions().length).toBeGreaterThan(5)
    expect(roleOptions()).toContain('Suikastçı')
    expect(laneOptions()).toContain('Orman')
  })

  it('bölge filtresi yalnız o bölgenin şampiyonlarını verir', () => {
    const f: PoolFilter = { kind: 'region', value: 'Noxus' }
    const ids = pooledIds(f, 'classic')
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.length).toBeLessThan(CHAMPIONS.length)
    for (const id of ids) {
      expect(CHAMPIONS.find((c) => c.id === id)!.region).toBe('Noxus')
    }
    expect(poolCount(f)).toBe(ids.length)
  })

  it('rol filtresi çok rollü şampiyonu da kapsar', () => {
    const f: PoolFilter = { kind: 'role', value: 'Tank' }
    for (const id of pooledIds(f, 'classic')) {
      expect(CHAMPIONS.find((c) => c.id === id)!.roles).toContain('Tank')
    }
  })

  it('emoji modunda filtre, emoji verisi olanlarla kesişir', () => {
    const ids = pooledIds({ kind: 'region', value: 'Ionia' }, 'emoji')
    for (const id of ids) expect(EMOJI_IDS).toContain(id)
  })

  it('havuzu boşaltan filtre yok sayılır (çözülemez bulmaca üretilmez)', () => {
    const ids = pooledIds({ kind: 'region', value: 'OlmayanBölge' }, 'classic')
    expect(ids.length).toBe(CHAMPIONS.length) // tüm havuza dönüldü
  })

  it('Sınırsız: filtreli tur yalnız o havuzdan çeker', () => {
    const f: PoolFilter = { kind: 'region', value: 'Demacia' }
    for (let i = 0; i < 30; i++) {
      expect(champOf(nextPuzzle('endless', 'classic', f)).region).toBe('Demacia')
    }
  })

  it('Zamana Karşı seed akışı da filtreye uyar ve deterministik kalır', () => {
    const f: PoolFilter = { kind: 'role', value: 'Nişancı' }
    const a = createTimedStream(777, 'classic', f)
    const b = createTimedStream(777, 'classic', f)
    for (let i = 0; i < 12; i++) {
      const pa = a.next()
      expect(champOf(pa).roles).toContain('Nişancı')
      expect(champOf(pa).id).toBe(champOf(b.next()).id) // aynı seed → aynı dizi
    }
  })

  it('Günlük filtreden etkilenmez — herkes aynı bulmacayı çözer', () => {
    const filtreli = nextPuzzle('daily', 'classic', { kind: 'region', value: 'Noxus' })
    const filtresiz = nextPuzzle('daily', 'classic')
    expect(champOf(filtreli).id).toBe(champOf(filtresiz).id)
  })

  it('matches temel davranış', () => {
    const c = CHAMPIONS[0]
    expect(matches(c, ALL_FILTER)).toBe(true)
    expect(matches(c, { kind: 'region', value: c.region })).toBe(true)
    expect(matches(c, { kind: 'region', value: '___yok___' })).toBe(false)
  })
})
