/**
 * Rastgelelik altyapısı.
 *
 * KRİTİK TASARIM KARARI: Endless ve Zamana Karşı modları GERÇEK rastgele —
 * crypto.getRandomValues, kullanıcıya/cihaza/oturuma özel. İki kişi oyunu
 * açtığında aynı şampiyonun gelmesi istenmiyor (kullanıcının açık isteği).
 * TEK istisna Günlük mod: tarihten türetilen deterministik hash — orada da
 * herkese aynı çıkması bilerek (skor karşılaştırma).
 */

/** [0, max) aralığında kriptografik rastgele tamsayı — modulo bias'sız */
export function cryptoRandInt(max: number): number {
  if (max <= 0) return 0
  const range = 0x100000000
  const limit = range - (range % max)
  const buf = new Uint32Array(1)
  do {
    crypto.getRandomValues(buf)
  } while (buf[0] >= limit)
  return buf[0] % max
}

/** Fisher-Yates — yerinde karıştırır, crypto kaynaklı */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = cryptoRandInt(i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** FNV-1a — Günlük mod için deterministik hash (herkese aynı) */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Yerel tarihe göre "YYYY-MM-DD" — günlük bulmaca anahtarı */
export function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Günlük mod: tarih + alt mod → havuz index'i (deterministik) */
export function dailyIndex(subMode: string, poolSize: number): number {
  return fnv1a(`${todayKey()}:${subMode}`) % poolSize
}

/**
 * Deterministik yardımcı RNG (mulberry32) — Günlük modda bulmacanın
 * ek rastgeleliği için (hangi yetenek, kırpma noktası vb.) — yine herkese aynı.
 */
export function seededRng(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
