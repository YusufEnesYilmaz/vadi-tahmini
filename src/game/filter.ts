import { CHAMPIONS, EMOJI_IDS } from './data'
import type { Champion, SubMode } from './types'

/**
 * Havuz filtresi — Sınırsız ve Zamana Karşı'da şampiyon havuzunu daraltır
 * ("sadece Noxus", "sadece Suikastçılar"). Antrenman gibi çalışır: zayıf
 * olduğun bölgeyi/rolü ayrı çalışabilirsin.
 *
 * Günlük'te YOK — herkesin aynı bulmacayı çözmesi gerekiyor.
 * İstatistikler filtreye göre AYRIŞMAZ (bilinçli): yoksa mod × zorluk × filtre
 * kombinasyonu yüzlerce ayrı tabloya bölünür ve hiçbiri anlamlı veri toplayamaz.
 */
export type PoolFilter =
  | { kind: 'all' }
  | { kind: 'region'; value: string }
  | { kind: 'role'; value: string }
  | { kind: 'lane'; value: string }

export const ALL_FILTER: PoolFilter = { kind: 'all' }

/** Deste anahtarı ve meydan okuma linki için kısa metin gösterimi */
export function filterKey(f: PoolFilter): string {
  return f.kind === 'all' ? 'all' : `${f.kind}:${f.value}`
}

/** "region:Noxus" → filtre nesnesi; tanınmayan girdi güvenli şekilde "tümü" olur */
export function parseFilterKey(s: string | undefined | null): PoolFilter {
  if (!s || s === 'all') return ALL_FILTER
  const i = s.indexOf(':')
  if (i < 0) return ALL_FILTER
  const kind = s.slice(0, i)
  const value = s.slice(i + 1)
  if (!value) return ALL_FILTER
  if (kind === 'region' || kind === 'role' || kind === 'lane') return { kind, value }
  return ALL_FILTER
}

export function filterLabel(f: PoolFilter): string {
  return f.kind === 'all' ? 'Tüm şampiyonlar' : f.value
}

export function matches(c: Champion, f: PoolFilter): boolean {
  switch (f.kind) {
    case 'all': return true
    case 'region': return c.region === f.value
    case 'role': return c.roles.includes(f.value)
    case 'lane': return c.lanes.includes(f.value)
  }
}

export function filteredChampions(f: PoolFilter): Champion[] {
  return CHAMPIONS.filter((c) => matches(c, f))
}

/**
 * Bir alt modun filtre uygulanmış şampiyon id havuzu.
 * Emoji modu ayrıca emoji verisi olanlarla kesişir.
 * Havuz boşalırsa (ör. o bölgede emoji verisi olan şampiyon yok) filtre
 * yok sayılır — çözülemez bulmaca göstermektense tüm havuza dönmek iyidir.
 */
export function pooledIds(f: PoolFilter, sub: SubMode): string[] {
  const base = sub === 'emoji' ? EMOJI_IDS : CHAMPIONS.map((c) => c.id)
  if (f.kind === 'all') return base
  const allowed = new Set(filteredChampions(f).map((c) => c.id))
  const narrowed = base.filter((id) => allowed.has(id))
  return narrowed.length > 0 ? narrowed : base
}

/** Menüde "kaç şampiyon kaldı" göstermek için */
export function poolCount(f: PoolFilter): number {
  return filteredChampions(f).length
}

// ---- Seçenekler veriden türetilir (elle liste tutulmaz) ----

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'tr'))
}

export function regionOptions(): string[] {
  return uniqueSorted(CHAMPIONS.map((c) => c.region))
}

export function roleOptions(): string[] {
  return uniqueSorted(CHAMPIONS.flatMap((c) => c.roles))
}

export function laneOptions(): string[] {
  return uniqueSorted(CHAMPIONS.flatMap((c) => c.lanes))
}

// ---- Tercih saklama ----

const KEY = 'vt:filter'

export function getFilter(): PoolFilter {
  try {
    return parseFilterKey(localStorage.getItem(KEY))
  } catch {
    return ALL_FILTER
  }
}

export function setFilter(f: PoolFilter) {
  localStorage.setItem(KEY, filterKey(f))
}
