import { CHAMPIONS } from './data'
import { allCriteria } from './bingo'
import { cryptoRandInt } from './rng'

/*
 * "Kaç Tane?" modu — bir ölçüt verilir (ör. "Zaun"), oyuncu o ölçüte uyan
 * şampiyonları arka arkaya isimlendirir; süre dolmadan kaç tanesini bulduğu skoru.
 *
 * Ölçütler `bingo.ts`'in `allCriteria()`'sından türer (tek kaynak) ve **YALNIZ TEKLİ**
 * olur — "Zaun", "Yordle", "Alt koridoru" gibi. İkili AND kombinasyonları
 * ("Canavar + Yakın dövüş") kullanıcı isteğiyle KALDIRILDI: soru kafada anında
 * canlanmalı, iki koşulu aynı anda tartmak süreli modda yorucu oluyordu.
 *
 * Havuz boyutu [MIN,MAX] dışında kalanlar elenir: çok dar (2 kişi) sıkıcı;
 * çok geniş olanlar ("Mana kullanır" 145, "Üst koridoru" 60) 60 saniyede
 * bitirilemez, tur sonundaki "kaçırdıkların" listesi de 50 isme çıkar.
 */

export const COUNT_SECONDS = 60

/**
 * Ceza: ART ARDA bu kadar yanlış seçim süreden `PENALTY_SECONDS` yakar.
 * Toplam yanlış DEĞİL art arda sayılır — arada doğru bulan oyuncu ceza yemez;
 * amaç öneri listesini sırayla deneyip eleme (brute force) yolunu kapatmak.
 * Arayüz metinleri de bu sabitlerden türer, elle yazılmaz.
 */
export const WRONG_STREAK_PENALTY = 5
export const PENALTY_SECONDS = 10
const MIN_POOL = 4
const MAX_POOL = 30

export const COUNTER_BEST_KEY = 'vt:counter:best'

export interface CountChallenge {
  /** Ekranda gösterilen ölçüt etiketi, ör. "Noxus + Menzilli" */
  label: string
  /** Ölçüte uyan şampiyon id'leri — cevap kümesi */
  ids: string[]
}

/** Tüm geçerli sayım ölçütleri — TEKLİ ölçütlerin havuzu [MIN_POOL, MAX_POOL] olanları. */
export function buildChallenges(): CountChallenge[] {
  const out: CountChallenge[] = []
  for (const c of allCriteria()) {
    const ids = CHAMPIONS.filter(c.test).map((ch) => ch.id)
    if (ids.length >= MIN_POOL && ids.length <= MAX_POOL) out.push({ label: c.label, ids })
  }
  return out
}

let cache: CountChallenge[] | null = null
export function allChallenges(): CountChallenge[] {
  if (!cache) cache = buildChallenges()
  return cache
}

/** Rastgele ölçüt — art arda aynı etiketi vermez */
export function randomChallenge(avoidLabel?: string): CountChallenge {
  const all = allChallenges()
  const pool = avoidLabel ? all.filter((c) => c.label !== avoidLabel) : all
  const list = pool.length > 0 ? pool : all
  return list[cryptoRandInt(list.length)]
}

/**
 * Seçilen şampiyon ölçüte uyuyor mu. Giriş artık öneri listesinden geldiği için
 * elde ad değil **id** var — metinden ada eşleme (`matchInChallenge`) kaldırıldı.
 * Uydurma id de doğal olarak `false` döner.
 */
export function isInChallenge(ch: CountChallenge, id: string): boolean {
  return ch.ids.includes(id)
}

export function getCounterBest(): number {
  return Number(localStorage.getItem(COUNTER_BEST_KEY) ?? 0)
}

/** Skoru en iyiyse kaydeder; yeni rekor olup olmadığını döner */
export function recordCounterScore(score: number): boolean {
  if (score > getCounterBest()) {
    localStorage.setItem(COUNTER_BEST_KEY, String(score))
    return true
  }
  return false
}
