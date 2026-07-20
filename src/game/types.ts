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

/** Alt mod: ne tahmin ediliyor */
export type SubMode = 'classic' | 'ability' | 'splash' | 'skin'

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
]
