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
    species: 'İnsan',
    year: null,
    skins: [],
    spells: SPELLS,
    passive: { name: '', img: '' },
  }
}

const SAMPLE: Champion[] = [
  makeChampion("Kai'Sa", 'Void', ['Nişancı'], ['Alt']),
  makeChampion('Master Yi', 'Ionia', ['Suikastçı'], ['Orman']),
  makeChampion("Bel'Veth", 'Void', ['Savaşçı'], ['Orman']),
  makeChampion('Çetin', 'Demacia', ['Tank'], ['Üst']),
]

describe('champion guide helper', () => {
  it('arama toLetters ile büyük-küçük ve noktalama işaretlerinden bağımsızdır', () => {
    expect(filterGuideChampions(SAMPLE, 'belveth', ALL_FILTER).map((c) => c.name)).toEqual(["Bel'Veth"])
    expect(filterGuideChampions(SAMPLE, 'kai sa', ALL_FILTER).map((c) => c.name)).toEqual(["Kai'Sa"])
  })

  it('arama ve filtreler birlikte uygulanır', () => {
    const filter: PoolFilter = { ...ALL_FILTER, regions: ['Ionia'], roles: ['Suikastçı'], lanes: ['Orman'] }
    expect(filterGuideChampions(SAMPLE, 'yi', filter).map((c) => c.name)).toEqual(['Master Yi'])
    expect(filterGuideChampions(SAMPLE, 'kai', filter)).toEqual([])
  })

  it('sonuçları tr yerelinde ada göre sıralar', () => {
    expect(filterGuideChampions(SAMPLE, '', ALL_FILTER).map((c) => c.name)).toEqual([
      "Bel'Veth",
      'Çetin',
      "Kai'Sa",
      'Master Yi',
    ])
  })
})
