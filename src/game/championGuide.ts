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
): Champion[] {
  const query = toLetters(search.trim())
  return champions
    .filter((champion) => matches(champion, filter) && (!query || toLetters(champion.name).includes(query)))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
}
