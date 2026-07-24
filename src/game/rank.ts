/**
 * Sihirdar unvanı — menüdeki rozetin (`🛡️ Demacia Muhafızı`) TEK KAYNAĞI.
 *
 * Unvan, oyuncunun ulaştığı **en uzun günlük oyun serisine** göre yükselir
 * (üst üste kaç gün Günlük bulmaca oynadığı — `getDailyStreak().best`).
 * **EN İYİ seri kullanılır, GÜNCEL değil (kullanıcı kararı):** bir gün kaçırıp
 * seri kırılsa bile unvan DÜŞMEZ, kazanılmış bir rozet gibi kalır.
 * Rozetteki `🔥 N Gün` GÜNCEL seridir; unvan en iyi seriden gelir — ikisi ayrıdır.
 *
 * Eşikler bilinçle 3 günden başlar: bir gün oynamak unvan kazandırmaz
 * (kullanıcı: "ıvır zıvıra ödül olmasın"). 7 kademe.
 */

export interface SummonerTitle {
  /** Bu unvan için gereken en az (en iyi) günlük seri */
  min: number
  title: string
  icon: string
  /** CSS renk değişkeni (index.css'te tanımlı) */
  color: string
  /** Liste panelinde gösterilen kısa açıklama */
  blurb: string
}

/** En düşükten en yükseğe. `min` = gün. KESİN ARTAN olmalı (test bunu korur). */
export const SUMMONER_TITLES: SummonerTitle[] = [
  { min: 0, title: 'Sihirdar Çırağı', icon: '🌱', color: 'var(--text-dim)', blurb: 'Yolculuk yeni başladı.' },
  { min: 3, title: 'Vadi Savaşçısı', icon: '⚔️', color: 'var(--accent-done)', blurb: 'Üç gün üst üste geldin.' },
  { min: 7, title: 'Demacia Muhafızı', icon: '🛡️', color: 'var(--accent-endless)', blurb: 'Bir haftalık seri!' },
  { min: 14, title: 'Kıdemli Avcı', icon: '🏹', color: 'var(--accent-timed)', blurb: 'İki hafta hiç kaçırmadın.' },
  { min: 30, title: 'Ionia Bilgesi', icon: '🔮', color: 'var(--accent-mystic)', blurb: 'Bir aylık sadakat.' },
  { min: 60, title: 'Usta Sihirdar', icon: '🌟', color: 'var(--diff-hard)', blurb: 'İki ay boyunca her gün.' },
  { min: 100, title: 'Runeterra Efsanesi', icon: '👑', color: 'var(--gold-bright)', blurb: 'Yüz günlük efsane seri.' },
]

/** Verilen (en iyi) gün serisine karşılık gelen unvan (eşiği geçen EN YÜKSEK). */
export function titleFor(bestStreakDays: number): SummonerTitle {
  for (let i = SUMMONER_TITLES.length - 1; i >= 0; i--) {
    if (bestStreakDays >= SUMMONER_TITLES[i].min) return SUMMONER_TITLES[i]
  }
  return SUMMONER_TITLES[0] // min:0 hep var → teorik olarak buraya düşülmez
}

/** Bir sonraki unvan (ilerleme çubuğu için). Zirvedeyse `null`. */
export function nextTitle(bestStreakDays: number): SummonerTitle | null {
  return SUMMONER_TITLES.find((t) => t.min > bestStreakDays) ?? null
}
