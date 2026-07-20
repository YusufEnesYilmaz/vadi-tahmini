import { describe, expect, it } from 'vitest'
import { CHAMPIONS, EMOJI_IDS } from './data'
import {
  ALL_FILTER, filterKey, filteredChampions, isAllFilter, matches, parseFilterKey, poolCount, pooledIds, toggleValue,
  regionOptions, roleOptions, laneOptions, type PoolFilter,
} from './filter'
import { createTimedStream, nextPuzzle } from './puzzle'
import { champOf } from '../test/helpers'

describe('havuz filtresi', () => {
  it('anahtar gidiş-dönüş korunur', () => {
    const cases: PoolFilter[] = [
      ALL_FILTER,
      { ...ALL_FILTER, regions: ['Noxus'] },
      { ...ALL_FILTER, roles: ['Suikastçı'] },
      { ...ALL_FILTER, lanes: ['Orman'] },
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
    const f: PoolFilter = { ...ALL_FILTER, regions: ['Noxus'] }
    const ids = pooledIds(f, 'classic')
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.length).toBeLessThan(CHAMPIONS.length)
    for (const id of ids) {
      expect(CHAMPIONS.find((c) => c.id === id)!.region).toBe('Noxus')
    }
    expect(poolCount(f)).toBe(ids.length)
  })

  it('rol filtresi çok rollü şampiyonu da kapsar', () => {
    const f: PoolFilter = { ...ALL_FILTER, roles: ['Tank'] }
    for (const id of pooledIds(f, 'classic')) {
      expect(CHAMPIONS.find((c) => c.id === id)!.roles).toContain('Tank')
    }
  })

  it('emoji modunda filtre, emoji verisi olanlarla kesişir', () => {
    const ids = pooledIds({ ...ALL_FILTER, regions: ['Ionia'] }, 'emoji')
    for (const id of ids) expect(EMOJI_IDS).toContain(id)
  })

  it('havuzu boşaltan filtre yok sayılır (çözülemez bulmaca üretilmez)', () => {
    const ids = pooledIds({ ...ALL_FILTER, regions: ['OlmayanBölge'] }, 'classic')
    expect(ids.length).toBe(CHAMPIONS.length) // tüm havuza dönüldü
  })

  it('Sınırsız: filtreli tur yalnız o havuzdan çeker', () => {
    const f: PoolFilter = { ...ALL_FILTER, regions: ['Demacia'] }
    for (let i = 0; i < 30; i++) {
      expect(champOf(nextPuzzle('endless', 'classic', f)).region).toBe('Demacia')
    }
  })

  it('Zamana Karşı seed akışı da filtreye uyar ve deterministik kalır', () => {
    const f: PoolFilter = { ...ALL_FILTER, roles: ['Nişancı'] }
    const a = createTimedStream(777, 'classic', f)
    const b = createTimedStream(777, 'classic', f)
    for (let i = 0; i < 12; i++) {
      const pa = a.next()
      expect(champOf(pa).roles).toContain('Nişancı')
      expect(champOf(pa).id).toBe(champOf(b.next()).id) // aynı seed → aynı dizi
    }
  })

  it('Günlük filtreden etkilenmez — herkes aynı bulmacayı çözer', () => {
    const filtreli = nextPuzzle('daily', 'classic', { ...ALL_FILTER, regions: ['Noxus'] })
    const filtresiz = nextPuzzle('daily', 'classic')
    expect(champOf(filtreli).id).toBe(champOf(filtresiz).id)
  })

  it('matches temel davranış', () => {
    const c = CHAMPIONS[0]
    expect(matches(c, ALL_FILTER)).toBe(true)
    expect(matches(c, { ...ALL_FILTER, regions: [c.region] })).toBe(true)
    expect(matches(c, { ...ALL_FILTER, regions: ['___yok___'] })).toBe(false)
  })
})

describe('çoklu seçim', () => {
  it('aynı grupta VEYA: iki bölge birden gelir', () => {
    const f: PoolFilter = { ...ALL_FILTER, regions: ['Noxus', 'Ionia'] }
    const ids = pooledIds(f, 'classic')
    const regions = new Set(ids.map((id) => CHAMPIONS.find((c) => c.id === id)!.region))
    expect(regions).toEqual(new Set(['Noxus', 'Ionia']))
    // Havuz, tek tek seçmenin toplamı kadar olmalı
    expect(poolCount(f)).toBe(
      poolCount({ ...ALL_FILTER, regions: ['Noxus'] }) + poolCount({ ...ALL_FILTER, regions: ['Ionia'] }),
    )
  })

  it('gruplar arasında VE: bölge + rol kesişimi', () => {
    const f: PoolFilter = { ...ALL_FILTER, regions: ['Noxus'], roles: ['Suikastçı'] }
    for (const c of filteredChampions(f)) {
      expect(c.region).toBe('Noxus')
      expect(c.roles).toContain('Suikastçı')
    }
    // Kesişim, tek başına her birinden küçük ya da eşit olmalı
    expect(poolCount(f)).toBeLessThanOrEqual(poolCount({ ...ALL_FILTER, regions: ['Noxus'] }))
  })

  it('toggle ekler ve çıkarır', () => {
    let f = toggleValue(ALL_FILTER, 'region', 'Noxus')
    f = toggleValue(f, 'region', 'Ionia')
    expect(f.regions).toEqual(['Noxus', 'Ionia'])
    f = toggleValue(f, 'region', 'Noxus')
    expect(f.regions).toEqual(['Ionia'])
    expect(isAllFilter(toggleValue(f, 'region', 'Ionia'))).toBe(true)
  })

  it('anahtar sıralı üretilir — seçim sırası desteyi bölmez', () => {
    const a: PoolFilter = { ...ALL_FILTER, regions: ['Ionia', 'Noxus'] }
    const b: PoolFilter = { ...ALL_FILTER, regions: ['Noxus', 'Ionia'] }
    expect(filterKey(a)).toBe(filterKey(b))
  })

  it('çok gruplu anahtar gidiş-dönüş korunur', () => {
    const f: PoolFilter = { ...ALL_FILTER, regions: ['Noxus', 'Ionia'], roles: ['Tank'], lanes: ['Üst'] }
    const round = parseFilterKey(filterKey(f))
    expect(new Set(round.regions)).toEqual(new Set(f.regions))
    expect(round.roles).toEqual(f.roles)
    expect(round.lanes).toEqual(f.lanes)
  })

  it('ESKİ tek-seçim anahtarları okunmaya devam eder (paylaşılmış linkler bozulmasın)', () => {
    expect(parseFilterKey('region:Noxus')).toEqual({ ...ALL_FILTER, regions: ['Noxus'] })
    expect(parseFilterKey('role:Tank')).toEqual({ ...ALL_FILTER, roles: ['Tank'] })
    expect(parseFilterKey('lane:Üst')).toEqual({ ...ALL_FILTER, lanes: ['Üst'] })
  })

  it('imkânsız kombinasyon havuzu boşaltır ama oyun tüm havuza döner', () => {
    const f: PoolFilter = { ...ALL_FILTER, regions: ['___yok___'], roles: ['Tank'] }
    expect(poolCount(f)).toBe(0)
    expect(pooledIds(f, 'classic').length).toBe(CHAMPIONS.length)
  })
})
