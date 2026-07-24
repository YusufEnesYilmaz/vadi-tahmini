import { describe, expect, it } from 'vitest'
import { filterGuideChampions } from './championGuide'
import { ALL_FILTER, type PoolFilter } from './filter'
import type { Champion, Spell } from './types'

const SPELLS: Spell[] = [
  { slot: 'Q', name: '', img: '' },
  { slot: 'W', name: '', img: '' },
  { slot: 'E', name: '', img: '' },
  { slot: 'R', name: '', img: '' },
]

function makeChampion(
  name: string,
  region: string,
  roles: string[],
  lanes: string[],
  year: number | null = null,
): Champion {
  return {
    id: name.replace(/[^A-Za-z]/g, '') || 'champion',
    key: 0,
    name,
    title: '',
    roles,
    lanes,
    resource: 'Mana',
    rangeType: 'Menzilli',
    region,
    gender: 'Bilinmiyor',
    species: 'Insan',
    year,
    skins: [],
    spells: SPELLS,
    passive: { name: '', img: '' },
  }
}

const SAMPLE: Champion[] = [
  makeChampion("Kai'Sa", 'Void', ['Nisanci'], ['Alt'], 2018),
  makeChampion('Master Yi', 'Ionia', ['Suikastci'], ['Orman'], 2009),
  makeChampion("Bel'Veth", 'Void', ['Savasci'], ['Orman'], 2022),
  makeChampion('Cetin', 'Demacia', ['Tank'], ['Ust'], null),
]

describe('champion guide helper', () => {
  it('search is normalized with toLetters', () => {
    expect(filterGuideChampions(SAMPLE, 'belveth', ALL_FILTER).map((c) => c.name)).toEqual(["Bel'Veth"])
    expect(filterGuideChampions(SAMPLE, 'kai sa', ALL_FILTER).map((c) => c.name)).toEqual(["Kai'Sa"])
  })

  it('search and pool filters work together', () => {
    const filter: PoolFilter = { ...ALL_FILTER, regions: ['Ionia'], roles: ['Suikastci'], lanes: ['Orman'] }
    expect(filterGuideChampions(SAMPLE, 'yi', filter).map((c) => c.name)).toEqual(['Master Yi'])
    expect(filterGuideChampions(SAMPLE, 'kai', filter)).toEqual([])
  })

  it('sorts results by champion name', () => {
    expect(filterGuideChampions(SAMPLE, '', ALL_FILTER).map((c) => c.name)).toEqual([
      "Bel'Veth",
      'Cetin',
      "Kai'Sa",
      'Master Yi',
    ])
  })

  it('applies selected years and keeps all champions when year filter is empty', () => {
    expect(filterGuideChampions(SAMPLE, '', ALL_FILTER, [2022, 2018]).map((c) => c.name)).toEqual([
      "Bel'Veth",
      "Kai'Sa",
    ])
    expect(filterGuideChampions(SAMPLE, '', ALL_FILTER, []).map((c) => c.name)).toEqual([
      "Bel'Veth",
      'Cetin',
      "Kai'Sa",
      'Master Yi',
    ])
  })
})
