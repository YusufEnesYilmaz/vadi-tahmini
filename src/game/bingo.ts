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

const YEAR_SPLIT = 2016

/** Havuzdaki tüm olası ölçütler — veriden türer */
export function allCriteria(): Criterion[] {
  const uniq = (vals: string[]) => [...new Set(vals)].sort((a, b) => a.localeCompare(b, 'tr'))
  const out: Criterion[] = []

  for (const r of uniq(CHAMPIONS.map((c) => c.region))) {
    out.push({ id: `b:${r}`, label: r, test: (c) => c.region === r })
  }
  for (const r of uniq(CHAMPIONS.flatMap((c) => c.roles))) {
    out.push({ id: `r:${r}`, label: r, test: (c) => c.roles.includes(r) })
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
    { id: 'men:yakin', label: 'Yakın dövüş', test: (c) => c.rangeType === 'Yakın Dövüş' },
    { id: 'men:uzak', label: 'Menzilli', test: (c) => c.rangeType === 'Menzilli' },
    { id: 'yil:eski', label: `${YEAR_SPLIT} öncesi`, test: (c) => (c.year ?? 9999) < YEAR_SPLIT },
    { id: 'yil:yeni', label: `${YEAR_SPLIT} ve sonrası`, test: (c) => (c.year ?? 0) >= YEAR_SPLIT },
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
