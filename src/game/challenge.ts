import type { Difficulty, PlaySub } from './types'

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
}

const VERSION = 1
const SUBS = ['classic', 'ability', 'splash', 'skin', 'emoji', 'quote', 'mix']
const DIFFS = ['easy', 'normal', 'hard', 'insane']

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
  // Kısa anahtarlar: link kısa kalsın
  const payload = { v: VERSION, s: c.seed >>> 0, m: c.sub, d: c.diff, sc: c.score, cb: c.combo, n: c.nick }
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
