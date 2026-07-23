import bundled from '../data/champions.json'
import emojiData from '../data/emoji.json'
import itemData from '../data/items.json'
import type { ChampionData, Champion, Item, ItemData, ItemPart } from './types'

/**
 * Veri kaynağı: yalnız uygulamayla gelen gömülü JSON (`champions.json`,
 * `build-data.mjs` ile üretilip commit'lenir). Web'de yeni sürüm push'lanınca
 * Vercel + PWA hem kodu hem gömülü veriyi güncelliyor — ekstra bir şeye gerek yok.
 *
 * Eskiden Ayarlar'daki "Veriyi güncelle" butonu ddragon'dan veriyi runtime'da
 * yeniden kurup buraya (`vt:data:updated`) yazıyordu; ama o runtime kayıt
 * uygulamanın sonradan eklediği alanları (lanes, ayrı item/emoji dosyaları,
 * yeni modlar) içermeyen ESKİ şemada kalıyor ve şampiyonları bozuyordu.
 * Buton kaldırıldı; aşağıdaki temizlik, daha önce basıp verisi bozulmuş
 * kullanıcıları bir sonraki açılışta otomatik düzeltir.
 */
try {
  localStorage.removeItem('vt:data:updated')
} catch { /* localStorage yoksa önemsiz */ }

export const DATA: ChampionData = bundled as ChampionData
export const CHAMPIONS: Champion[] = DATA.champions
export const PATCH = DATA.version

export function byId(id: string): Champion | undefined {
  return CHAMPIONS.find((c) => c.id === id)
}

// ---- Replik modu sesleri (CommunityDragon, Türkçe seslendirme) ----

const CDRAGON = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/tr_tr/v1'

/**
 * Şampiyon seçme / yasaklama replikleri — 173/173 şampiyon için TR sesi doğrulandı (2026-07-20).
 * `key` ddragon'daki sayısal ID; CDragon aynı numarayı kullanıyor.
 */
export function voiceUrl(key: number, kind: 'ban' | 'choose' | 'sfx'): string {
  if (kind === 'sfx') {
    return 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-sfx-audios/' + key + '.ogg'
  }
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
/**
 * Fiyatlar Summoner's Rift fiyatlarıdır (ddragon `gold.total`).
 * Tam Gaz / Arena gibi özel modların AYRI eşya kayıtları vardır (aynı ad, farklı
 * fiyat) — bunlar `build-data.mjs`'te 4 haneli id kuralıyla havuz dışında tutulur.
 * Sızarlarsa otomatik tamamlamada aynı ad iki kez çıkar ve oyuncu doğru adı
 * yazdığı hâlde kaybeder (2026-07-23'te bir kez yaşandı).
 */
export const ITEMS: Item[] = (itemData as ItemData).items

export function itemById(id: string): Item | undefined {
  return ITEMS.find((i) => i.id === id)
}

/**
 * Bileşen sözlüğü — yalnız ipucu ÇİZİMİ için, tahmin havuzu DEĞİL.
 * Bileşenler ucuz ara eşyalar olduğu için `ITEMS`'te yoklar; `itemById` ile
 * aranınca bulunamıyor ve bileşen ipucu 143 eşyanın 128'inde boş çıkıyordu.
 */
export const PARTS: Record<string, ItemPart> = (itemData as ItemData).parts

export function partById(id: string): ItemPart | undefined {
  return PARTS[id]
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
