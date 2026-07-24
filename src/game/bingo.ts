import { CHAMPIONS } from './data'
import { fnv1a, seededRng, todayKey } from './rng'
import type { Champion } from './types'

/**
 * Bingo modu — ekrana gelen şampiyonu uyduğu kutuya yerleştir.
 *
 * 12 ölçüt kutusu, 90 saniye. Ölçütler MEVCUT veriden türetilir (bölge, rol,
 * koridor, kaynak, tür) — elle liste tutulmuyor, yeni şampiyon/bölge gelince
 * kendiliğinden kapsanıyor.
 *
 * Günlük: tarihten deterministik, herkeste aynı kart ve aynı şampiyon sırası.
 */

export interface Criterion {
  id: string
  label: string
  test: (c: Champion) => boolean
}

/** Nesil (dönem) sınırları — İlk ≤2011 · Orta 2012–2016 · Yeni ≥2017 */
const ERA_EARLY_MAX = 2011
const ERA_MID_MAX = 2016

/** Havuzdaki tüm olası ölçütler — veriden türer */
export function allCriteria(): Criterion[] {
  const uniq = (vals: string[]) => [...new Set(vals)].sort((a, b) => a.localeCompare(b, 'tr'))
  const out: Criterion[] = []

  for (const r of uniq(CHAMPIONS.map((c) => c.region))) {
    out.push({ id: `b:${r}`, label: r, test: (c) => c.region === r })
  }
  // Rol = Riot'un BİRİNCİL sınıfı (ddragon tags[0]). `includes` KULLANILMAZ:
  // ddragon her şampiyona ikincil etiket de basıyor (Tristana/Lucian "Nişancı,Suikastçı")
  // → "Suikastçı" havuzu nişancı/savaşçıyla dolup anlamsızlaşıyordu (kullanıcı bildirdi:
  // "Tristana/Lucian ne zamandır suikastçı"). Birincil sınıf her rolde ≥17 tutuyor.
  for (const r of uniq(CHAMPIONS.map((c) => c.roles[0]))) {
    out.push({ id: `r:${r}`, label: r, test: (c) => c.roles[0] === r })
  }
  for (const l of uniq(CHAMPIONS.flatMap((c) => c.lanes))) {
    out.push({ id: `k:${l}`, label: `${l} koridoru`, test: (c) => c.lanes.includes(l) })
  }
  for (const s of uniq(CHAMPIONS.map((c) => c.species))) {
    out.push({ id: `t:${s}`, label: s, test: (c) => c.species === s })
  }
  out.push(
    { id: 'kay:mana', label: 'Mana kullanır', test: (c) => c.resource === 'Mana' },
    { id: 'kay:yok', label: 'Kaynaksız', test: (c) => c.resource === 'Kaynaksız' },
    // Küçük ama tematik kaynak havuzları (Enerji=6 ninja/enerji, Öfke=4). Bingo'ya
    // girmezler (≥8 filtresi eler) ama Bağlantılar (≥4) ve Kaç Tane? ([4,30]) besler.
    { id: 'kay:enerji', label: 'Enerji kullanır', test: (c) => c.resource === 'Enerji' },
    { id: 'kay:ofke', label: 'Öfke kullanır', test: (c) => c.resource === 'Öfke' },
    { id: 'men:yakin', label: 'Yakın dövüş', test: (c) => c.rangeType === 'Yakın Dövüş' },
    { id: 'men:uzak', label: 'Menzilli', test: (c) => c.rangeType === 'Menzilli' },
    // Nesil (dönem) — 3 kriterli TEK boyut → Dokuz Kare'de EKSEN olabilir (2 kovalı
    // yıl olamıyordu). Eski 2016-öncesi/sonrası ikilisinin yerini aldı; 3 dönem hem
    // Bingo kutusunda daha çok bilgi hem Grid'e "Nesil × Bölge/Rol" ızgarası açar.
    { id: 'nesil:ilk', label: `İlk Nesil (2009–${ERA_EARLY_MAX})`, test: (c) => (c.year ?? 9999) <= ERA_EARLY_MAX },
    { id: 'nesil:orta', label: `Orta Nesil (${ERA_EARLY_MAX + 1}–${ERA_MID_MAX})`, test: (c) => { const y = c.year ?? 0; return y > ERA_EARLY_MAX && y <= ERA_MID_MAX } },
    { id: 'nesil:yeni', label: `Yeni Nesil (${ERA_MID_MAX + 1}+)`, test: (c) => (c.year ?? 0) > ERA_MID_MAX },
  )
  return out
}

export const BOX_COUNT = 12
export const BINGO_SECONDS = 90

/**
 * Kart üretimi. Her ölçütün havuzda yeterince şampiyonu olmalı (>= 8) —
 * yoksa kutu neredeyse doldurulamaz ve tur baştan kaybedilmiş olur.
 */
export function buildCard(rand: () => number): Criterion[] {
  const uygun = allCriteria().filter((k) => CHAMPIONS.filter(k.test).length >= 8)
  const havuz = [...uygun]
  for (let i = havuz.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[havuz[i], havuz[j]] = [havuz[j], havuz[i]]
  }
  return havuz.slice(0, BOX_COUNT)
}

/** Günlük kart — tarihten türer */
export function dailyCard(): Criterion[] {
  return buildCard(seededRng(fnv1a(`${todayKey()}:bingo`)))
}

/**
 * Şampiyon akışı: karttaki EN AZ BİR kutuya uyan şampiyonlar.
 * Hiçbir kutuya uymayan şampiyon göstermek oyuncuyu boşuna pas geçirtir.
 */
export function championStream(card: Criterion[], rand: () => number): Champion[] {
  const uygun = CHAMPIONS.filter((c) => card.some((k) => k.test(c)))
  const sira = [...uygun]
  for (let i = sira.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[sira[i], sira[j]] = [sira[j], sira[i]]
  }
  return sira
}

/** Bir şampiyonun doldurabileceği (henüz dolmamış) kutuların indeksleri */
export function fittingBoxes(card: Criterion[], filled: (string | null)[], c: Champion): number[] {
  const out: number[] = []
  for (let i = 0; i < card.length; i++) {
    if (!filled[i] && card[i].test(c)) out.push(i)
  }
  return out
}
