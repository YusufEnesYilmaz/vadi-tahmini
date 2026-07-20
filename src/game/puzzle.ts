import { CHAMPIONS, byId } from './data'
import { getDeck } from './deck'
import { cryptoRandInt, dailyIndex, fnv1a, seededRng, todayKey } from './rng'
import type { Champion, Skin, SubMode, TopMode } from './types'

export interface Puzzle {
  sub: SubMode
  champion: Champion
  skin?: Skin // skin modunda hedef kostüm
  spellIndex?: number // ability: 0=Pasif, 1..4=Q W E R
  crop?: { x: number; y: number } // splash: odak noktası (%)
}

/** Skin havuzu: "champId:num" anahtarları (kararlı sıra — günlük mod için önemli) */
function skinPool(): string[] {
  const keys: string[] = []
  for (const c of CHAMPIONS) for (const s of c.skins) keys.push(`${c.id}:${s.num}`)
  return keys
}

function resolveSkin(key: string): { champion: Champion; skin: Skin } {
  const [id, numStr] = key.split(':')
  const champion = byId(id)!
  const skin = champion.skins.find((s) => s.num === Number(numStr))!
  return { champion, skin }
}

/**
 * Bulmaca üretimi.
 * - endless/timed → deste sistemi (crypto rastgele, kişiye özel; tekrar yok)
 * - daily → tarihten deterministik (herkese aynı)
 * Deste anahtarı alt moda göre: endless ve timed AYNI desteden çeker
 * (plan: "deck:classic" vb.) → iki üst modda da tekrar hissi olmaz.
 */
export function nextPuzzle(top: TopMode, sub: SubMode): Puzzle {
  if (top === 'daily') return dailyPuzzle(sub)

  if (sub === 'skin') {
    const key = getDeck('skin', skinPool()).draw()
    const { champion, skin } = resolveSkin(key)
    // Kostüm de kırpık gösterilir — tamamı görünürse oyun çok kolay
    return { sub, champion, skin, crop: { x: 20 + cryptoRandInt(61), y: 20 + cryptoRandInt(61) } }
  }

  const id = getDeck(sub, CHAMPIONS.map((c) => c.id)).draw()
  const champion = byId(id)!
  if (sub === 'ability') {
    return { sub, champion, spellIndex: cryptoRandInt(5) }
  }
  if (sub === 'splash') {
    // Kırpma odağı: kenarlardan uzak dur (%20–80) — genelde karakter ortada
    return { sub, champion, crop: { x: 20 + cryptoRandInt(61), y: 20 + cryptoRandInt(61) } }
  }
  return { sub, champion }
}

function dailyPuzzle(sub: SubMode): Puzzle {
  const rng = seededRng(fnv1a(`${todayKey()}:${sub}:extra`))

  if (sub === 'skin') {
    const pool = skinPool()
    const { champion, skin } = resolveSkin(pool[dailyIndex(sub, pool.length)])
    return { sub, champion, skin, crop: { x: 20 + Math.floor(rng() * 61), y: 20 + Math.floor(rng() * 61) } }
  }

  const champion = CHAMPIONS[dailyIndex(sub, CHAMPIONS.length)]
  if (sub === 'ability') {
    return { sub, champion, spellIndex: Math.floor(rng() * 5) }
  }
  if (sub === 'splash') {
    return { sub, champion, crop: { x: 20 + Math.floor(rng() * 61), y: 20 + Math.floor(rng() * 61) } }
  }
  return { sub, champion }
}
