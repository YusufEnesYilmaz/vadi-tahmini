import { createClient } from '@supabase/supabase-js'
import { LEADERBOARD_DIFFS, type Difficulty } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isLeaderboardEnabled = !!(supabaseUrl && supabaseKey)

export const supabase = isLeaderboardEnabled
  ? createClient(supabaseUrl, supabaseKey)
  : null

export interface LeaderboardEntry {
  /**
   * Oyuncunun DEĞİŞMEZ kimliği. "Bu satır ben miyim?" sorusu YALNIZ bununla
   * cevaplanır — takma ad kimlik değildir, iki kişi aynı adı yazabilir
   * (yazıyordu da: ikisi de "(Sen)" görüyordu).
   */
  playerId: string
  /** Yalnız görüntü adı — değişebilir, tekil değildir */
  nick: string
  score: number
}

// ---- Gönderim başarısızlığının izi ----

/**
 * Neden localStorage: gönderim oyun ekranında oluyor, uyarı Sıralama panelinde
 * gösteriliyor — arada ekran değişimi ve sayfa yenilemesi var. Bellekteki bir
 * bayrak bunları aşamazdı.
 */
const FAIL_KEY = 'vt:lb:fail'

export interface SubmitFailure {
  /** Zaman damgası (ms) */
  at: number
  /** Hangi mod anahtarına yazılamadı ("timed:classic:normal") */
  mode: string
  /** Teknik mesaj — kullanıcıya küçük punto, hata bildirirken işe yarar */
  msg: string
}

export function getSubmitFailure(): SubmitFailure | null {
  try {
    const raw = localStorage.getItem(FAIL_KEY)
    if (!raw) return null
    const f = JSON.parse(raw) as SubmitFailure
    return typeof f?.at === 'number' && typeof f?.mode === 'string' ? f : null
  } catch {
    return null
  }
}

/**
 * Uyarı kaydını siler.
 * - Argümansız: koşulsuz siler ("Gizle" butonu).
 * - `onlyMode` ile: **yalnız kayıtlı hata o moda aitse** siler. Başarılı bir Günlük
 *   gönderimi, yazılamamış bir Zamana Karşı skorunun uyarısını kaldırmamalı —
 *   bu uyarı zaten "sessizce kaybolan arıza" sorununu çözmek için var.
 */
export function clearSubmitFailure(onlyMode?: string) {
  try {
    if (onlyMode !== undefined && getSubmitFailure()?.mode !== onlyMode) return
    localStorage.removeItem(FAIL_KEY)
  } catch { /* önemsiz */ }
}

function markSubmitFailure(mode: string, msg: string) {
  try {
    localStorage.setItem(FAIL_KEY, JSON.stringify({ at: Date.now(), mode, msg } satisfies SubmitFailure))
  } catch { /* önemsiz */ }
}

/**
 * Tek gönderim yolu. **Dönüş değeri OKUNMAK ZORUNDA:** `supabase.rpc()` Postgres
 * hatasında exception FIRLATMAZ, hatayı `{ error }` içinde döndürür. Eskiden dönüş
 * atılıyordu ve yalnız `try/catch` vardı → "fonksiyon yok" hatası konsola bile
 * düşmedi, gönderim aylarca sessizce başarısız oldu (2026-07-23'te fark edildi).
 */
async function callSubmit(mode: string, params: Record<string, unknown>): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase.rpc('submit_score', params)
    if (error) {
      console.error(`Leaderboard submit failed (${mode}):`, error.message)
      markSubmitFailure(mode, error.message)
      return false
    }
    clearSubmitFailure(mode) // yalnız AYNI modun eski uyarısını kaldırır
    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'bağlantı hatası'
    console.error(`Leaderboard submit failed (${mode}):`, msg)
    markSubmitFailure(mode, msg)
    return false
  }
}

/** Zamana Karşı skorunu kaydeder (yalnızca eskisinden yüksekse veya ad değiştiyse günceller) */
export async function submitTimedScore(playerId: string, sub: string, diff: string, nick: string, score: number) {
  if (!supabase || !nick.trim() || score <= 0) return
  // Sıralama yalnız Zor + Aşırı Zor (kullanıcı kararı). Kolay/Normal skorları
  // global tabloya HİÇ gönderilmez — yerel istatistik/rekorlar etkilenmez.
  if (!LEADERBOARD_DIFFS.includes(diff as Difficulty)) return
  const mode = `timed:${sub}:${diff}`
  await callSubmit(mode, {
    p_player_id: playerId,
    p_nick: nick.trim(),
    p_mode: mode,
    p_score: score,
  })
}

/** Günlük tahmin sayısını kaydeder (yalnızca eskisinden daha az denemeyse veya ad değiştiyse günceller) */
export async function submitDailyScore(playerId: string, sub: string, date: string, nick: string, guesses: number) {
  if (!supabase || !nick.trim() || guesses <= 0) return
  const mode = `daily:${sub}`
  await callSubmit(mode, {
    p_player_id: playerId,
    p_nick: nick.trim(),
    p_mode: mode,
    p_score: guesses,
    p_date: date,
  })
}

/** Oyuncunun adını değiştirdiğinde tüm eski skorlarının adını günceller */
export async function updateLeaderboardNick(playerId: string, newNick: string) {
  if (!supabase || !newNick.trim()) return
  try {
    // Burada da dönüş okunuyor — ama ad güncellemesi başarısız olursa kullanıcıya
    // uyarı BASILMAZ: skoru kaybettiren bir şey değil, yalnız görünen ad eski kalır.
    const { error } = await supabase.rpc('update_player_nick', {
      p_player_id: playerId,
      p_nick: newNick.trim(),
    })
    if (error) console.error('Update leaderboard nick failed:', error.message)
  } catch (err) {
    console.error('Update leaderboard nick failed:', err)
  }
}

/** Zamana Karşı sıralamasını getirir (yüksek skor üste) */
export async function getTimedLeaderboard(sub: string, diff: string): Promise<LeaderboardEntry[]> {
  if (!supabase) return []
  const mode = `timed:${sub}:${diff}`

  try {
    const { data, error } = await supabase
      .from('vt_leaderboard')
      .select('player_id, nick, score')
      .eq('mode', mode)
      .order('score', { ascending: false })
      .limit(50)

    if (error) throw error
    return (data || []).map((d) => ({ playerId: d.player_id, nick: d.nick, score: Number(d.score) }))
  } catch (err) {
    console.error('Get timed leaderboard failed:', err)
    return []
  }
}

/** Günlük sıralamasını getirir (düşük tahmin sayısı üste) */
export async function getDailyLeaderboard(sub: string, date: string): Promise<LeaderboardEntry[]> {
  if (!supabase) return []
  const mode = `daily:${sub}`

  try {
    const { data, error } = await supabase
      .from('vt_leaderboard')
      .select('player_id, nick, score')
      .eq('mode', mode)
      .eq('date', date)
      .order('score', { ascending: true })
      .limit(50)

    if (error) throw error
    return (data || []).map((d) => ({ playerId: d.player_id, nick: d.nick, score: Number(d.score) }))
  } catch (err) {
    console.error('Get daily leaderboard failed:', err)
    return []
  }
}
