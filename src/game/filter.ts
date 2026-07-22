import { CHAMPIONS, EMOJI_IDS } from './data'
import type { Champion, SubMode } from './types'

/**
 * Havuz filtresi — Sınırsız ve Zamana Karşı'da şampiyon havuzunu daraltır
 * ("sadece Noxus", "Noxus + Ionia", "Noxus'lu suikastçılar"). Antrenman gibi
 * çalışır: zayıf olduğun bölgeyi/rolü ayrı çalışabilirsin.
 *
 * ÇOKLU SEÇİM (2026-07-21, kullanıcı isteği):
 * - Aynı grup içinde **VEYA**: Noxus + Ionia = ikisinden biri
 * - Gruplar arasında **VE**: Noxus + Büyücü = Noxus'lu büyücüler
 * Boş dizi = o grupta kısıt yok.
 *
 * Günlük'te YOK — herkesin aynı bulmacayı çözmesi gerekiyor.
 * İstatistikler filtreye göre AYRIŞMAZ (bilinçli): yoksa mod × zorluk × filtre
 * kombinasyonu yüzlerce ayrı tabloya bölünür ve hiçbiri anlamlı veri toplayamaz.
 */
export interface PoolFilter {
  regions: string[]
  roles: string[]
  lanes: string[]
}

export type FilterKind = 'region' | 'role' | 'lane'

export const ALL_FILTER: PoolFilter = { regions: [], roles: [], lanes: [] }

/** Hangi grubun hangi alana baktığı — tek yerde tanımlı */
const FIELD: Record<FilterKind, keyof PoolFilter> = {
  region: 'regions',
  role: 'roles',
  lane: 'lanes',
}

export function isAllFilter(f: PoolFilter): boolean {
  return f.regions.length === 0 && f.roles.length === 0 && f.lanes.length === 0
}

export function selected(f: PoolFilter, kind: FilterKind): string[] {
  return f[FIELD[kind]]
}

/** Seçeneği ekler/çıkarır — seçiliye tekrar dokunmak kaldırır */
export function toggleValue(f: PoolFilter, kind: FilterKind, value: string): PoolFilter {
  const field = FIELD[kind]
  const cur = f[field]
  const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
  return { ...f, [field]: next }
}

/**
 * Deste anahtarı ve meydan okuma linki için metin gösterimi.
 * Sıralı üretilir: aynı seçim her zaman aynı anahtarı versin (deste kararlılığı).
 */
export function filterKey(f: PoolFilter): string {
  if (isAllFilter(f)) return 'all'
  const part = (prefix: string, vals: string[]) =>
    vals.length ? `${prefix}:${[...vals].sort((a, b) => a.localeCompare(b, 'tr')).join('+')}` : ''
  return [part('r', f.regions), part('o', f.roles), part('k', f.lanes)].filter(Boolean).join(';')
}

/**
 * Anahtarı filtreye çevirir. **Eski tek-seçim anahtarları da okunur**
 * ("region:Noxus") — kayıtlı tercihler ve daha önce paylaşılmış meydan okuma
 * linkleri çalışmaya devam etsin diye; göç kodu yazmaya gerek kalmadı.
 */
export function parseFilterKey(s: string | undefined | null): PoolFilter {
  if (!s || s === 'all') return ALL_FILTER

  // Eski biçim: "region:Noxus" / "role:Büyücü" / "lane:Üst"
  const legacy = /^(region|role|lane):(.+)$/.exec(s)
  if (legacy) return toggleValue(ALL_FILTER, legacy[1] as FilterKind, legacy[2])

  const out: PoolFilter = { regions: [], roles: [], lanes: [] }
  for (const chunk of s.split(';')) {
    const i = chunk.indexOf(':')
    if (i < 0) continue
    // Ön ek TAM eşleşmeli: "olmayan:Noxus" ilk harfi 'o' diye rol sanılmamalı
    const prefix = chunk.slice(0, i)
    const values = chunk.slice(i + 1).split('+').filter(Boolean)
    if (prefix === 'r') out.regions = values
    else if (prefix === 'o') out.roles = values
    else if (prefix === 'k') out.lanes = values
  }
  return out
}

export function filterLabel(f: PoolFilter): string {
  if (isAllFilter(f)) return 'Tüm şampiyonlar'
  const all = [...f.regions, ...f.roles, ...f.lanes]
  // Uzun listeyi başlığa sığdırmaya çalışma — sayıya düş
  return all.length <= 3 ? all.join(' · ') : `${all.length} filtre`
}

/** Grup içi VEYA, gruplar arası VE */
export function matches(c: Champion, f: PoolFilter): boolean {
  if (f.regions.length && !f.regions.includes(c.region)) return false
  if (f.roles.length && !f.roles.some((r) => c.roles.includes(r))) return false
  if (f.lanes.length && !f.lanes.some((l) => c.lanes.includes(l))) return false
  return true
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
  if (isAllFilter(f)) return base
  const allowed = new Set(filteredChampions(f).map((c) => c.id))
  const narrowed = base.filter((id) => allowed.has(id))
  return narrowed.length > 0 ? narrowed : base
}

/** Menüde "kaç şampiyon kaldı" göstermek için */
export function poolCount(f: PoolFilter): number {
  return filteredChampions(f).length
}

/** Bu seçeneğe dokunursam havuz kaça iner — rozetlerin yanındaki sayı */
export function countWith(f: PoolFilter, kind: FilterKind, value: string): number {
  return poolCount(toggleValue(f, kind, value))
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
