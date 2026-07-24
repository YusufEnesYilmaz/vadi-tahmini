/*
 * Mini oyunların (Kelime / Bingo) günlük depo anahtarları + "bugün bitti mi" kontrolü.
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

export type MiniGameId = 'wordle' | 'bingo'

/** İlgili mini oyunun BUGÜNKÜ günlüğü tamamlandı mı? Bozuk/eksik kayıtta güvenle false döner. */
export function miniDailyDone(id: MiniGameId): boolean {
  const key = id === 'wordle' ? WORDLE_DAILY_KEY : BINGO_DAILY_KEY
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return false
    const s = JSON.parse(raw) as { date?: string; done?: boolean; over?: boolean; won?: boolean }
    if (s.date !== todayKey()) return false
    // Kelime "done" ile, Bingo süre bitince (over) ya da kart dolunca (won) biter.
    return id === 'wordle' ? !!s.done : !!(s.over || s.won)
  } catch {
    return false
  }
}
