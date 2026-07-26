import type { Item } from './types'
import { toLetters } from './wordle'

const TR_COLLATOR = new Intl.Collator('tr')

export const ITEM_PRICE_BANDS = [
  { id: 'low', label: '1600-2299 Altın', min: 1600, max: 2299 },
  { id: 'mid', label: '2300-2699 Altın', min: 2300, max: 2699 },
  { id: 'high', label: '2700-3099 Altın', min: 2700, max: 3099 },
  { id: 'elite', label: '3100+ Altın', min: 3100, max: null },
] as const

export type ItemPriceBand = (typeof ITEM_PRICE_BANDS)[number]
export type ItemPriceBandId = ItemPriceBand['id']

function compareGuideItems(a: Item, b: Item): number {
  return TR_COLLATOR.compare(a.name, b.name) || a.id.localeCompare(b.id)
}

function bandById(id?: ItemPriceBandId | null): ItemPriceBand | undefined {
  return ITEM_PRICE_BANDS.find((band) => band.id === id)
}

export function filterGuideItems(
  items: Item[],
  search: string,
  tags: string[] = [],
  band?: ItemPriceBandId | null,
): Item[] {
  const query = toLetters(search.trim())
  const priceBand = bandById(band)

  return items
    .filter((item) => {
      const matchesSearch = !query || toLetters(item.name).includes(query)
      const matchesTags = !tags.length || tags.every((tag) => item.tags.includes(tag))
      const matchesBand = !priceBand || (
        item.gold >= priceBand.min &&
        (priceBand.max == null || item.gold <= priceBand.max)
      )

      return matchesSearch && matchesTags && matchesBand
    })
    .sort(compareGuideItems)
}

export function buildsInto(id: string, items: Item[]): Item[] {
  return items
    .filter((item) => item.from.includes(id))
    .sort(compareGuideItems)
}

export function itemTagOptions(items: Item[]): string[] {
  return [...new Set(items.flatMap((item) => item.tags))]
    .sort((a, b) => a.localeCompare(b, 'tr'))
}
