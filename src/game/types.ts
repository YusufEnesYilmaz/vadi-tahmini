export interface Skin {
  num: number
  name: string
}

export interface Spell {
  slot: 'Q' | 'W' | 'E' | 'R'
  name: string
  img: string
}

export interface Champion {
  id: string // ddragon ID (görsel yolları) — MonkeyKing gibi tuzaklara dikkat
  key: number
  name: string // TR görünen ad
  title: string
  roles: string[]
  lanes: string[] // koridorlar: Üst/Orman/Orta/Alt/Destek
  resource: string
  rangeType: 'Yakın Dövüş' | 'Menzilli'
  region: string
  gender: string
  species: string // elle yazılan veri (scripts/species.mjs) — hiçbir kaynakta yok
  year: number | null
  skins: Skin[]
  spells: Spell[]
  passive: { name: string; img: string }
}

export interface ChampionData {
  version: string
  generatedAt: string
  champions: Champion[]
}

/** Eşya modu verisi — scripts/build-data.mjs üretir (SR, 1600+ altın, tam eşyalar) */
export interface Item {
  id: string // ddragon eşya id'si ("3153")
  name: string // TR ad
  gold: number // toplam altın
  img: string // ikon dosyası ("3153.png")
  tags: string[] // TR stat etiketleri — ipucu
  desc?: string // uzun açıklama/pasif metni — rehber
  plain?: string // kısa özet — rehber
  from: string[] // bileşen id'leri — ipucu (ikonları gösterilir)
}

/**
 * Bileşen (ara eşya) — yalnız ipucu ikonu çizmek için. Tahmin havuzunda YER ALMAZ,
 * o yüzden `Item` değil: fiyatı/etiketi/`from`'u oyunda kullanılmıyor.
 */
export interface ItemPart {
  name: string
  img: string
  gold?: number
}

export interface ItemData {
  version: string
  items: Item[]
  parts: Record<string, ItemPart>
}

/** Üst mod: nasıl oynanıyor */
export type TopMode = 'endless' | 'daily' | 'timed'

/** Zorluk: Sınırsız ve Zamana Karşı'da geçerli (Günlük her zaman normal) */
export type Difficulty = 'easy' | 'normal' | 'hard' | 'insane'

export const DIFFICULTIES: { id: Difficulty; name: string }[] = [
  { id: 'easy', name: 'Kolay' },
  { id: 'normal', name: 'Normal' },
  { id: 'hard', name: 'Zor' },
  { id: 'insane', name: 'Aşırı Zor' },
]

/**
 * Küresel Sıralamaya giren zorluklar — yalnız Zor + Aşırı Zor (kullanıcı kararı).
 * TEK KAYNAK: hem Sıralama görünümü (`Leaderboard.tsx`) hem skor gönderimi
 * (`submitTimedScore`) bundan okur. Kolay/Normal Zamana Karşı skorları global
 * tabloya HİÇ gönderilmez; yerel istatistik/rekorlar tüm zorlukları saymaya devam eder.
 */
export const LEADERBOARD_DIFFS: Difficulty[] = ['hard', 'insane']

/** Alt mod: ne tahmin ediliyor (gerçek soru tipleri) */
export type SubMode = 'classic' | 'ability' | 'splash' | 'skin' | 'emoji' | 'quote' | 'item' | 'silhouette' | 'lore'

/** Şampiyon tahmin edilen alt modlar — Eşya modu bunların dışında kalır */
export type ChampionSubMode = Exclude<SubMode, 'item'>

/**
 * Oynanabilir alt mod: gerçek tipler + "mix" (Karışık).
 * SubMode bilerek 6'lı kalıyor — günlük/veri/emoji yolları hep gerçek tiple çalışır.
 * "mix" yalnız oyun yüzeyinde (menü, oyun ekranı, istatistik anahtarı) yaşar;
 * Puzzle.sub her zaman GERÇEK tiptir.
 */
export type PlaySub = SubMode | 'mix'

export const MIX_MODE = { id: 'mix' as const, name: 'Karışık', desc: 'Hepsi karışık gelsin', icon: '🎲' }

/** Bir PlaySub'ın görünen adı/ikonu — mix dahil */
export function subMeta(id: PlaySub): { id: PlaySub; name: string; desc: string; icon: string } {
  return id === 'mix' ? MIX_MODE : SUB_MODES.find((m) => m.id === id)!
}

export const TOP_MODES: { id: TopMode; name: string; desc: string; icon: string }[] = [
  { id: 'endless', name: 'Sınırsız', desc: 'Arka arkaya oyna, bekleme yok', icon: '∞' },
  { id: 'daily', name: 'Günlük', desc: 'Herkese aynı bulmaca, günde 1', icon: '📅' },
  // ⚠ Süre SABİT DEĞİL — zorluğa göre 90/60/45/30 (`RULES[diff].timedSeconds`).
  // Bu yüzden açıklamada sayı YAZILMAZ; yazılırsa Kolay/Zor oynayana yalan söyler
  // (aynı hata `share.ts`'te "60 saniyede" olarak bir kez yaşandı, 2026-07-23).
  { id: 'timed', name: 'Zamana Karşı', desc: 'Süre dolmadan kaç doğru?', icon: '⏱' },
]

/**
 * `daily: false` olan modlar Günlük'te ÇIKMAZ (kullanıcı kararı, 2026-07-21).
 * Gerekçe: her yeni mod Günlük rutinini uzatıyor ve "Tam Gün"ün eşiğini
 * yükseltiyordu. Günlük çekirdek 7 modda sabit; yeni modlar Sınırsız ve
 * Zamana Karşı'da yaşıyor. Günlükte de istenirse buradaki bayrak açılır.
 */
export const SUB_MODES: { id: SubMode; name: string; desc: string; icon: string; daily?: boolean }[] = [
  { id: 'classic', name: 'Klasik', desc: 'İpuçlarından şampiyonu bul', icon: '🎯' },
  { id: 'ability', name: 'Yetenek', desc: 'Yetenek ikonundan şampiyonu bul', icon: '✨' },
  { id: 'splash', name: 'Görsel', desc: 'Kırpılmış görselden şampiyonu bul', icon: '🖼' },
  { id: 'skin', name: 'Kostüm', desc: 'Görselden kostümün adını bul', icon: '🎭' },
  { id: 'emoji', name: 'Emoji', desc: 'Emoji ipuçlarından şampiyonu bul', icon: '😀' },
  { id: 'quote', name: 'Replik', desc: 'Sesinden şampiyonu bul', icon: '🔊' },
  // Açıklama "ikonundan bul" DEĞİL: mod 2026-07-21'de ters çevrildi — ikon artık
  // soru değil, en son açılan ipucu. Soru altın değeriyle başlıyor.
  { id: 'item', name: 'Eşya', desc: 'Altın ve statlardan eşyayı bul', icon: '🗡' },
  { id: 'silhouette', name: 'Silüet', desc: 'Karartılmış görselden şampiyonu bul', icon: '👤', daily: false },
  { id: 'lore', name: 'Hikâye', desc: 'Şampiyonun hikâyesinden bul', icon: '📜', daily: false },
]

/** Günlük'te oynanabilen alt modlar — "Tam Gün" ve takvim bunların üzerinden sayar */
export const DAILY_SUBS = SUB_MODES.filter((m) => m.daily !== false)
