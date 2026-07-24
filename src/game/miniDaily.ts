/*
 * Mini oyunların günlük depo anahtarları + "bugün bitti mi" kontrolü.
 *
 * TEK KAYNAK: anahtar string'leri burada durur; component'ler de menü de buradan okur,
 * böylece menüdeki "✓ Bitti" göstergesi oyunun kilidiyle asla ayrışamaz.
 *
 * Not: God mode BİLEREK dikkate alınmaz. Bu fonksiyon "depoda bugün bitmiş bir kayıt
 * var mı" sorusunu cevaplar; god yalnız kilidi gevşetip tekrar oynatır, "bitirdin mi"
 * gerçeğini değiştirmez.
 */

import { todayKey } from './rng'

export const WORDLE_DAILY_KEY = 'vt:wordle:daily'
export const BINGO_DAILY_KEY = 'vt:bingo:daily'
export const TIMELINE_DAILY_KEY = 'vt:timeline:daily'
export const HUNT_DAILY_KEY = 'vt:hunt:daily'
export const GRID_DAILY_KEY = 'vt:grid:daily'
export const CONN_DAILY_KEY = 'vt:conn:daily'

export type MiniGameId = 'wordle' | 'bingo' | 'timeline' | 'hunt' | 'grid' | 'connections'

const KEYS: Record<MiniGameId, string> = {
  wordle: WORDLE_DAILY_KEY,
  bingo: BINGO_DAILY_KEY,
  timeline: TIMELINE_DAILY_KEY,
  hunt: HUNT_DAILY_KEY,
  grid: GRID_DAILY_KEY,
  connections: CONN_DAILY_KEY,
}

/** İlgili mini oyunun BUGÜNKÜ günlüğü tamamlandı mı? Bozuk/eksik kayıtta güvenle false döner. */
export function miniDailyDone(id: MiniGameId): boolean {
  try {
    const raw = localStorage.getItem(KEYS[id])
    if (!raw) return false
    const s = JSON.parse(raw) as { date?: string; done?: boolean; over?: boolean; won?: boolean }
    if (s.date !== todayKey()) return false
    // Kelime `done` yazar; diğerlerinde bitiş = over || won
    if (id === 'wordle') return !!s.done
    return !!(s.over || s.won)
  } catch {
    return false
  }
}
