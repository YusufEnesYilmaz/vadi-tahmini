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

/** Alt mod: ne tahmin ediliyor (gerçek soru tipleri) */
export type SubMode = 'classic' | 'ability' | 'splash' | 'skin' | 'emoji' | 'quote'

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
  { id: 'timed', name: 'Zamana Karşı', desc: '60 saniyede kaç doğru?', icon: '⏱' },
]

export const SUB_MODES: { id: SubMode; name: string; desc: string; icon: string }[] = [
  { id: 'classic', name: 'Klasik', desc: 'İpuçlarından şampiyonu bul', icon: '🎯' },
  { id: 'ability', name: 'Yetenek', desc: 'Yetenek ikonundan şampiyonu bul', icon: '✨' },
  { id: 'splash', name: 'Görsel', desc: 'Kırpılmış görselden şampiyonu bul', icon: '🖼' },
  { id: 'skin', name: 'Kostüm', desc: 'Görselden kostümün adını bul', icon: '🎭' },
  { id: 'emoji', name: 'Emoji', desc: 'Emoji ipuçlarından şampiyonu bul', icon: '😀' },
  { id: 'quote', name: 'Replik', desc: 'Sesinden şampiyonu bul', icon: '🔊' },
]
