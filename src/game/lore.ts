import type { Champion } from './types'

/**
 * Lore modu verisi. Metinler ANA pakette değil (~272 KB) — ilk lore bulmacasında
 * dinamik import ile iner, sonrası modül önbelleğinden gelir.
 * `ChampionInfo` de aynı dosyayı kullanıyor; ikisi aynı parçayı paylaşır.
 */
interface InfoEntry {
  lore: string
  passive: { name: string; desc: string }
  spells: { slot: string; name: string; desc: string }[]
}

let cache: Record<string, InfoEntry> | null = null

export async function loadLore(): Promise<Record<string, InfoEntry>> {
  cache ??= (await import('../data/champion-info.json')).default as Record<string, InfoEntry>
  return cache
}

/** Yüklendiyse anında ver (ilk kare boş kalmasın) */
export function loreFromCache(id: string): string | undefined {
  return cache?.[id]?.lore
}

const BLOCK = '█████'

/**
 * Şampiyonun adını metinden siler — yoksa lore cevabı doğrudan söylüyor.
 * Ad parçaları da ayrı ayrı taranır ("Miss Fortune" → "Fortune" de gizlenir).
 * Türkçe ekler adın peşinde kalır ("Ahri'nin" → "█████'nin"): ipucu değil, doğal akış.
 */
export function censorName(text: string, champion: Champion): string {
  const parts = new Set<string>([champion.name])
  for (const token of champion.name.split(/[\s'’]+/)) {
    if (token.length >= 4) parts.add(token)
  }
  // Uzundan kısaya: "Master Yi" önce gitsin, sonra "Master"
  const ordered = [...parts].sort((a, b) => b.length - a.length)
  let out = text
  for (const p of ordered) {
    const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(esc, 'gi'), BLOCK)
  }
  // Arka arkaya gelen bloklar tek blok olsun ("█████ █████" → "█████")
  return out.replace(new RegExp(`(${BLOCK}[\\s,]*)+${BLOCK}`, 'g'), BLOCK)
}

/** Metni cümlelere böler — ipuçları cümle cümle açılıyor */
export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0)
}
