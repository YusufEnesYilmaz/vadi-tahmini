import { ALL_FILTER, matches, type PoolFilter } from './filter'
import type { Champion } from './types'
import { toLetters } from './wordle'

/**
 * Rehber listesi: yerel arama + yerel filtreler birlikte uygulanır, sonuçlar TR
 * adına göre sabit sıralanır. Kalıcı oyun filtresinden özellikle AYRIDIR.
 */
export function filterGuideChampions(
  champions: Champion[],
  search: string,
  filter: PoolFilter = ALL_FILTER,
  years: number[] = [],
): Champion[] {
  const query = toLetters(search.trim())
  return champions
    .filter((champion) => {
      const matchesFilter = matches(champion, filter)
      const matchesYear = !years.length || (champion.year != null && years.includes(champion.year))
      const matchesSearch = !query || toLetters(champion.name).includes(query)
      return matchesFilter && matchesYear && matchesSearch
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
}
