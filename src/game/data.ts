import bundled from '../data/champions.json'
import emojiData from '../data/emoji.json'
import itemData from '../data/items.json'
import type { ChampionData, Champion, Item, ItemData } from './types'

const UPDATED_KEY = 'vt:data:updated'

/**
 * Veri kaynağı: Ayarlar > Güncelle ile çekilmiş daha yeni veri varsa onu,
 * yoksa uygulamayla gelen gömülü JSON'u kullanır.
 * Gömülü veri her zaman yedek — CDN erişilemese de oyun çalışır.
 */
function loadData(): ChampionData {
  try {
    const raw = localStorage.getItem(UPDATED_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ChampionData
      // Sürüm karşılaştır: güncellenen veri gömülüden yeniyse kullan
      if (parsed.champions?.length && cmpVersion(parsed.version, (bundled as ChampionData).version) > 0) {
        return parsed
      }
    }
  } catch {
    // bozuk kayıt → gömülüye düş
  }
  return bundled as ChampionData
}

export function cmpVersion(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

export const DATA: ChampionData = loadData()
export const CHAMPIONS: Champion[] = DATA.champions
export const PATCH = DATA.version

export function saveUpdatedData(data: ChampionData) {
  localStorage.setItem(UPDATED_KEY, JSON.stringify(data))
}

export function byId(id: string): Champion | undefined {
  return CHAMPIONS.find((c) => c.id === id)
}

// ---- Replik modu sesleri (CommunityDragon, Türkçe seslendirme) ----

const CDRAGON = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/tr_tr/v1'

/**
 * Şampiyon seçme / yasaklama replikleri — 173/173 şampiyon için TR sesi doğrulandı (2026-07-20).
 * `key` ddragon'daki sayısal ID; CDragon aynı numarayı kullanıyor.
 */
export function voiceUrl(key: number, kind: 'ban' | 'choose'): string {
  return `${CDRAGON}/champion-${kind}-vo/${key}.ogg`
}

// ---- Emoji modu ----

/** Elle yazılan emoji ipuçları — ddragon'da böyle bir veri yok */
export const EMOJI: Record<string, string[]> = (emojiData as { emoji: Record<string, string[]> }).emoji

/**
 * Emoji havuzu: sadece verisi OLAN şampiyonlar.
 * Yeni şampiyon çıktığında emoji'si yazılana kadar bu moda girmez —
 * boş ipuçlu bir bulmaca göstermektense atlamak daha iyi.
 */
export const EMOJI_IDS: string[] = CHAMPIONS.filter((c) => EMOJI[c.id]?.length).map((c) => c.id)

// ---- Görsel URL'leri (hepsi ddragon CDN — repo'da görsel yok) ----

const CDN = 'https://ddragon.leagueoflegends.com/cdn'

export function squareUrl(id: string): string {
  return `${CDN}/${PATCH}/img/champion/${id}.png`
}

/** Splash art — patch'ten bağımsız yol, yeni skinler ekstra iş gerektirmez */
export function splashUrl(id: string, num: number): string {
  return `${CDN}/img/champion/splash/${id}_${num}.jpg`
}

export function loadingUrl(id: string, num: number): string {
  return `${CDN}/img/champion/loading/${id}_${num}.jpg`
}

/**
 * Eşya modu havuzu. Şampiyon verisinden AYRI dosyada (`items.json`) —
 * "Veriyi güncelle" akışı şampiyonları tazeliyor, eşyalar patch'te
 * `node scripts/build-data.mjs` ile yenilenir.
 */
export const ITEMS: Item[] = (itemData as ItemData).items

export function itemById(id: string): Item | undefined {
  return ITEMS.find((i) => i.id === id)
}

export function itemIconUrl(img: string): string {
  return `${CDN}/${PATCH}/img/item/${img}`
}

export function spellUrl(img: string): string {
  return `${CDN}/${PATCH}/img/spell/${img}`
}

export function passiveUrl(img: string): string {
  return `${CDN}/${PATCH}/img/passive/${img}`
}

// ---- TR duyarlı arama normalizasyonu ----

/** "İ/ı" tuzağına düşmeden, aksan bağımsız karşılaştırma anahtarı */
export function searchKey(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // aksanları at (é→e)
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]/g, '') // boşluk, kesme işareti vb. at (Kai'Sa → kaisa)
}
