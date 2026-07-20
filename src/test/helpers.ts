import type { ChampionPuzzle, Puzzle } from '../game/puzzle'
import type { Champion } from '../game/types'

/** Şampiyonlu bulmacaya daralt — spellIndex/crop/skin gibi alanlara erişmek için */
export function asChamp(p: Puzzle): ChampionPuzzle {
  if (p.sub === 'item') throw new Error(`şampiyonlu bulmaca bekleniyordu, 'item' geldi`)
  return p
}

/**
 * Test yardımcısı: şampiyonlu bulmacadan şampiyonu alır.
 * Eşya modu bulmacasında şampiyon yoktur — beklenmedik şekilde gelirse
 * testin sessizce yanlış şey ölçmesindense hata vermesi daha iyi.
 */
export function champOf(p: Puzzle): Champion {
  if (p.sub === 'item') throw new Error(`şampiyonlu bulmaca bekleniyordu, 'item' geldi`)
  return p.champion
}
