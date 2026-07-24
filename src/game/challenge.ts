/*
 * Oyuncu kimliği + takma ad + "meydan okuma galibiyeti" sayacı.
 *
 * NOT (Faz 1b, 2026-07-24): Eski link tabanlı meydan okuma (?c=... URL'ine gömülü
 * seed/skor, encodeChallenge/parseChallenge) KALDIRILDI — yerini Kaç Tane?
 * multiplayer aldı. Bu dosyada yalnız üç kalıcı şey kaldı:
 *  - getNick/setNick: görünen ad (Ayarlar, Sıralama, Multi lobisi kullanır)
 *  - getPlayerId: kalıcı benzersiz kimlik ("bu ben miyim?" sorusu ADLA DEĞİL bununla cevaplanır)
 *  - getChallengeWins/recordChallengeWin: `vt:chwin` sayacı — rozetler
 *    (Meydan Okuyucu/Rakip/Gladyatör/Şampiyon) bunu okur. Artık Kaç Tane? Multi
 *    tur galibiyetleri besler; eski meydan okuma galibiyetleri sayılmaya devam eder.
 */

// ---- Takma ad (bir kez sorulur, Ayarlar'dan değişir) ----

const NICK_KEY = 'vt:nick'

export function getNick(): string {
  return localStorage.getItem(NICK_KEY) ?? ''
}

export function setNick(n: string) {
  localStorage.setItem(NICK_KEY, n.trim().slice(0, 20))
}

// ---- Kazanılan meydan okuma / Multi turu sayacı (rozet için) ----

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
