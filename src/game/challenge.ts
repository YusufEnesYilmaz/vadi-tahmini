import { DIFFICULTIES, MIX_MODE, SUB_MODES, type Difficulty, type PlaySub } from './types'
import { PATCH } from './data'

/**
 * Meydan okuma — backend'siz. Zamana Karşı turunun seed'i + skoru URL'e gömülür;
 * linki açan kişi createTimedStream(seed) ile BİREBİR aynı soru dizisini alır,
 * kendi skorunu rakibinkiyle karşılaştırır. Sunucu yok, hesap yok.
 */
export interface Challenge {
  seed: number
  sub: PlaySub
  diff: Difficulty
  score: number
  combo: number
  nick: string
  /** Havuz filtresi anahtarı ("all" / "region:Noxus") — iki oyuncu aynı havuzdan oynasın */
  filter: string
  /**
   * Linkin üretildiği VERİ sürümü (ddragon patch'i). Eski linklerde yok (undefined).
   * Uyuşmazlık linki geçersiz KILMAZ — yalnız "aynı seed farklı soru üretmiş olabilir"
   * uyarısı gösterilir.
   */
  dataVersion?: string
}

const VERSION = 1

/**
 * Geçerli mod/zorluk listeleri TANIMDAN türetilir, elle yazılmaz.
 * Elle yazıldığında yeni modlar (Eşya, Silüet, Hikâye) listede kalmıyordu:
 * o modlarda üretilen meydan okuma linkleri karşı tarafta sessizce reddediliyor,
 * kullanıcı menüye düşüyordu (2026-07-21'de fark edildi).
 */
const SUBS: string[] = [...SUB_MODES.map((m) => m.id), MIX_MODE.id]
const DIFFS: string[] = DIFFICULTIES.map((d) => d.id)

// base64url: URL'de + / = sorun çıkarır; TextEncoder Türkçe karakteri güvenli taşır
function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function encodeChallenge(c: Challenge): string {
  // Kısa anahtarlar: link kısa kalsın.
  // `dv` = VERİ sürümü (ddragon patch'i). `v`'den farklı: `v` payload BİÇİMİNİN
  // sürümü, `dv` soruların üretildiği HAVUZUN sürümü. Aynı seed farklı havuzla
  // farklı sorular üretir (2026-07-23'te eşya havuzu 143→109 olunca yaşandı),
  // o yüzden karşı taraf uyuşmazlığı görebilsin diye taşınıyor.
  const payload = { v: VERSION, dv: PATCH, s: c.seed >>> 0, m: c.sub, d: c.diff, sc: c.score, cb: c.combo, n: c.nick, f: c.filter }
  return toBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
}

/** Bozuk/eski/yabancı payload → null (asla patlamaz) */
export function parseChallenge(code: string): Challenge | null {
  try {
    const p = JSON.parse(new TextDecoder().decode(fromBase64Url(code))) as Record<string, unknown>
    if (p.v !== VERSION) return null
    if (typeof p.s !== 'number' || !Number.isFinite(p.s)) return null
    if (typeof p.m !== 'string' || !SUBS.includes(p.m)) return null
    if (typeof p.d !== 'string' || !DIFFS.includes(p.d)) return null
    if (typeof p.sc !== 'number' || typeof p.cb !== 'number') return null
    return {
      seed: p.s >>> 0,
      sub: p.m as PlaySub,
      diff: p.d as Difficulty,
      score: Math.max(0, Math.floor(p.sc)),
      combo: Math.max(0, Math.floor(p.cb)),
      nick: String(p.n ?? '').slice(0, 20),
      // Eski linklerde alan yok → "all" (filtre özelliğinden önceki linkler çalışmaya devam eder)
      filter: typeof p.f === 'string' ? p.f : 'all',
      // Eski linklerde `dv` yok → undefined. Link REDDEDİLMEZ; yalnız uyuşmazlık
      // bilinsin diye taşınır (havuz değiştiyse iki taraf farklı soru görebilir).
      dataVersion: typeof p.dv === 'string' ? p.dv : undefined,
    }
  } catch {
    return null
  }
}

export function challengeUrl(c: Challenge): string {
  return `${location.origin}${location.pathname}?c=${encodeChallenge(c)}`
}

// ---- Takma ad (bir kez sorulur, Ayarlar'dan değişir) ----

const NICK_KEY = 'vt:nick'

export function getNick(): string {
  return localStorage.getItem(NICK_KEY) ?? ''
}

export function setNick(n: string) {
  localStorage.setItem(NICK_KEY, n.trim().slice(0, 20))
}

// ---- Kazanılan meydan okuma sayacı (rozet için) ----

const CHWIN_KEY = 'vt:chwin'

export function getChallengeWins(): number {
  return Number(localStorage.getItem(CHWIN_KEY) ?? 0)
}

export function recordChallengeWin() {
  localStorage.setItem(CHWIN_KEY, String(getChallengeWins() + 1))
}

// ---- Benzersiz Oyuncu Kimliği (Sıralama ad değişikliklerinde çakışmayı önlemek için) ----

const PLAYER_ID_KEY = 'vt:player_id'

export function getPlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY)
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem(PLAYER_ID_KEY, id)
  }
  return id
}
