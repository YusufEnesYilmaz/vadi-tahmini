import { cryptoRandInt, shuffle } from './rng'

/**
 * Deste sistemi — Endless ve Zamana Karşı modlarının soru kaynağı.
 *
 * - Havuz Fisher-Yates (crypto) ile karıştırılır, sırayla çekilir.
 * - Deste bitince YENİDEN karıştırılır; yeni destenin ilk kartı bitenin
 *   son kartıyla aynıysa takas edilir → art arda aynı soru asla gelmez.
 * - Durum localStorage'da mod bazında ayrı anahtarla tutulur: sayfa
 *   yenilense bile deste kaldığı yerden devam eder.
 * - Havuz değişirse (yeni patch: yeni şampiyon/kostüm) deste otomatik
 *   yeniden kurulur (boyut uyuşmazlığı / bilinmeyen eleman kontrolü).
 */

interface DeckState {
  order: string[] // karıştırılmış eleman anahtarları
  pos: number // sıradaki çekilecek index
  last: string | null // en son çekilen (reshuffle koruması için)
}

/**
 * "Bu ikisi peş peşe gelmesin" kuralı. Kart ELENMEZ, ileri kaydırılır —
 * deste bir permütasyon olmayı sürdürür, her eleman tur içinde tam bir kez gelir.
 * Kural sağlanamıyorsa (uygun kart kalmadıysa) sıra olduğu gibi kullanılır.
 */
export type AvoidPair = (prev: string, next: string) => boolean

export class Deck {
  private storageKey: string
  private items: string[]
  private state: DeckState
  private avoid?: AvoidPair

  constructor(deckId: string, items: string[], avoid?: AvoidPair) {
    this.storageKey = `vt:deck:${deckId}`
    this.items = items
    this.avoid = avoid
    this.state = this.load() ?? this.freshState(null)
  }

  private freshState(avoidFirst: string | null): DeckState {
    const order = shuffle([...this.items])
    // Yeni destenin ilki, önceki destenin sonuyla aynıysa takas et
    if (avoidFirst !== null && order.length > 1 && order[0] === avoidFirst) {
      const j = 1 + cryptoRandInt(order.length - 1)
      ;[order[0], order[j]] = [order[j], order[0]]
    }
    return { order, pos: 0, last: avoidFirst }
  }

  private load(): DeckState | null {
    try {
      const raw = localStorage.getItem(this.storageKey)
      if (!raw) return null
      const s = JSON.parse(raw) as DeckState
      // Havuz değişmişse (yeni veri) deste geçersiz — yeniden kur
      if (!Array.isArray(s.order) || s.order.length !== this.items.length) return null
      const known = new Set(this.items)
      if (!s.order.every((k) => known.has(k))) return null
      return s
    } catch {
      return null
    }
  }

  private save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state))
  }

  /**
   * Sıradaki kart yasak ikiliyse, kalanlar arasından uygun olan ilk kartla takas et.
   * Takas yerinde yapılır: iki kart da destede kalır, yalnız sıraları değişir.
   */
  private applyAvoid() {
    const { order, pos, last } = this.state
    if (!this.avoid || last === null || pos >= order.length) return
    if (!this.avoid(last, order[pos])) return
    for (let j = pos + 1; j < order.length; j++) {
      if (!this.avoid(last, order[j])) {
        ;[order[pos], order[j]] = [order[j], order[pos]]
        return
      }
    }
    // Uygun kart kalmadı — kural esnetilir, oyun durmaz
  }

  /** Sıradaki elemanı çek — tekrar yok, bitince otomatik yeniden karışır */
  draw(): string {
    if (this.state.pos >= this.state.order.length) {
      this.state = this.freshState(this.state.last)
    }
    this.applyAvoid()
    const item = this.state.order[this.state.pos]
    this.state.pos++
    this.state.last = item
    this.save()
    return item
  }
}

const cache = new Map<string, Deck>()

/** Mod başına tek deste örneği (deckId örn: "endless:classic", "timed:skin") */
export function getDeck(deckId: string, items: string[], avoid?: AvoidPair): Deck {
  let d = cache.get(deckId)
  if (!d) {
    d = new Deck(deckId, items, avoid)
    cache.set(deckId, d)
  }
  return d
}
