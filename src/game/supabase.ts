import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isLeaderboardEnabled = !!(supabaseUrl && supabaseKey)

export const supabase = isLeaderboardEnabled
  ? createClient(supabaseUrl, supabaseKey)
  : null

export interface LeaderboardEntry {
  nick: string
  score: number
}

/** Zamana Karşı skorunu kaydeder (yalnızca eskisinden yüksekse veya ad değiştiyse günceller) */
export async function submitTimedScore(playerId: string, sub: string, diff: string, nick: string, score: number) {
  if (!supabase || !nick.trim() || score <= 0) return
  const mode = `timed:${sub}:${diff}`
  const cleanNick = nick.trim()

  try {
    const { data } = await supabase
      .from('vt_leaderboard')
      .select('id, score, nick')
      .eq('player_id', playerId)
      .eq('mode', mode)
      .maybeSingle()

    if (data) {
      const updates: Record<string, unknown> = {}
      if (score > Number(data.score)) {
        updates.score = score
      }
      if (data.nick !== cleanNick) {
        updates.nick = cleanNick
      }
      if (Object.keys(updates).length > 0) {
        await supabase
          .from('vt_leaderboard')
          .update(updates)
          .eq('id', data.id)
      }
    } else {
      await supabase
        .from('vt_leaderboard')
        .insert({ player_id: playerId, nick: cleanNick, mode, score })
    }
  } catch (err) {
    console.error('Leaderboard timed submit failed:', err)
  }
}

/** Günlük tahmin sayısını kaydeder (yalnızca eskisinden daha az denemeyse veya ad değiştiyse günceller) */
export async function submitDailyScore(playerId: string, sub: string, date: string, nick: string, guesses: number) {
  if (!supabase || !nick.trim() || guesses <= 0) return
  const mode = `daily:${sub}`
  const cleanNick = nick.trim()

  try {
    const { data } = await supabase
      .from('vt_leaderboard')
      .select('id, score, nick')
      .eq('player_id', playerId)
      .eq('mode', mode)
      .eq('date', date)
      .maybeSingle()

    if (data) {
      const updates: Record<string, unknown> = {}
      if (guesses < Number(data.score)) {
        updates.score = guesses
      }
      if (data.nick !== cleanNick) {
        updates.nick = cleanNick
      }
      if (Object.keys(updates).length > 0) {
        await supabase
          .from('vt_leaderboard')
          .update(updates)
          .eq('id', data.id)
      }
    } else {
      await supabase
        .from('vt_leaderboard')
        .insert({ player_id: playerId, nick: cleanNick, mode, score: guesses, date })
    }
  } catch (err) {
    console.error('Leaderboard daily submit failed:', err)
  }
}

/** Oyuncunun adını değiştirdiğinde tüm eski skorlarının adını günceller */
export async function updateLeaderboardNick(playerId: string, newNick: string) {
  if (!supabase || !newNick.trim()) return
  const cleanNick = newNick.trim()
  try {
    await supabase
      .from('vt_leaderboard')
      .update({ nick: cleanNick })
      .eq('player_id', playerId)
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
      .select('nick, score')
      .eq('mode', mode)
      .order('score', { ascending: false })
      .limit(50)

    if (error) throw error
    return (data || []).map((d) => ({ nick: d.nick, score: Number(d.score) }))
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
      .select('nick, score')
      .eq('mode', mode)
      .eq('date', date)
      .order('score', { ascending: true })
      .limit(50)

    if (error) throw error
    return (data || []).map((d) => ({ nick: d.nick, score: Number(d.score) }))
  } catch (err) {
    console.error('Get daily leaderboard failed:', err)
    return []
  }
}
