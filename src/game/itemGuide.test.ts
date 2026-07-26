import { describe, expect, it } from 'vitest'
import {
  ITEM_PRICE_BANDS,
  buildsInto,
  filterGuideItems,
  itemTagOptions,
} from './itemGuide'
import type { Item } from './types'

function makeItem(
  id: string,
  name: string,
  gold: number,
  tags: string[],
  from: string[] = [],
): Item {
  return {
    id,
    name,
    gold,
    img: `${id}.png`,
    tags,
    from,
  }
}

const SAMPLE: Item[] = [
  makeItem('3001', 'Aklın Sonu', 2800, ['Saldırı Hızı', 'Büyü Direnci'], ['1043']),
  makeItem('3002', 'Can Kılıcı', 2299, ['Can'], ['2001']),
  makeItem('3003', 'Çağrı Taşı', 2300, ['Can', 'Yetenek Hızı'], ['2001', '2002']),
  makeItem('3004', 'Çelik Zırh', 3099, ['Can', 'Zırh'], ['3002']),
  makeItem('3005', 'Işık Kalkanı', 3100, ['Zırh'], ['3004']),
  makeItem('3006', 'Zırh Özü', 1600, ['Zırh'], []),
]

describe('item guide helper', () => {
  it('normalizes Turkish-safe search with toLetters', () => {
    expect(filterGuideItems(SAMPLE, 'aklin sonu', []).map((item) => item.name)).toEqual(['Aklın Sonu'])
    expect(filterGuideItems(SAMPLE, 'kilici', []).map((item) => item.name)).toEqual(['Can Kılıcı'])
  })

  it('applies selected tags with AND logic', () => {
    expect(filterGuideItems(SAMPLE, '', ['Can']).map((item) => item.name)).toEqual([
      'Can Kılıcı',
      'Çağrı Taşı',
      'Çelik Zırh',
    ])

    expect(filterGuideItems(SAMPLE, '', ['Can', 'Zırh']).map((item) => item.name)).toEqual(['Çelik Zırh'])
  })

  it('uses inclusive price band boundaries', () => {
    expect(filterGuideItems(SAMPLE, '', [], ITEM_PRICE_BANDS[0].id).map((item) => item.name)).toEqual([
      'Can Kılıcı',
      'Zırh Özü',
    ])
    expect(filterGuideItems(SAMPLE, '', [], ITEM_PRICE_BANDS[1].id).map((item) => item.name)).toEqual(['Çağrı Taşı'])
    expect(filterGuideItems(SAMPLE, '', [], ITEM_PRICE_BANDS[2].id).map((item) => item.name)).toEqual([
      'Aklın Sonu',
      'Çelik Zırh',
    ])
    expect(filterGuideItems(SAMPLE, '', [], ITEM_PRICE_BANDS[3].id).map((item) => item.name)).toEqual(['Işık Kalkanı'])
  })

  it('sorts results in stable Turkish order', () => {
    expect(filterGuideItems(SAMPLE, '', []).map((item) => item.name)).toEqual([
      'Aklın Sonu',
      'Can Kılıcı',
      'Çağrı Taşı',
      'Çelik Zırh',
      'Işık Kalkanı',
      'Zırh Özü',
    ])
  })

  it('builds reverse component links', () => {
    expect(buildsInto('2001', SAMPLE).map((item) => item.name)).toEqual([
      'Can Kılıcı',
      'Çağrı Taşı',
    ])
    expect(buildsInto('3004', SAMPLE).map((item) => item.name)).toEqual(['Işık Kalkanı'])
  })

  it('returns all items for an empty search and no filters', () => {
    expect(filterGuideItems(SAMPLE, '', []).map((item) => item.id)).toEqual([
      '3001',
      '3002',
      '3003',
      '3004',
      '3005',
      '3006',
    ])
  })

  it('builds a unique Turkish-sorted tag list', () => {
    expect(itemTagOptions(SAMPLE)).toEqual([
      'Büyü Direnci',
      'Can',
      'Saldırı Hızı',
      'Yetenek Hızı',
      'Zırh',
    ])
  })
})
