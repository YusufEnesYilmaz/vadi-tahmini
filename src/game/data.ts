import bundled from '../data/champions.json'
import type { ChampionData, Champion } from './types'

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
