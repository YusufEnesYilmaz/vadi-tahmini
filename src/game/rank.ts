/**
 * Rank ligi — menüdeki rozetin (`🥇 Altın`) TEK KAYNAĞI. LoL rank merdiveni
 * (Demir → Şampiyon), 10 lig.
 *
 * Rank, oyuncunun ulaştığı **en uzun günlük oyun serisine** göre yükselir
 * (üst üste kaç gün Günlük bulmaca oynadığı — `getDailyStreak().best`).
 * **EN İYİ seri kullanılır, GÜNCEL değil (kullanıcı kararı):** bir gün kaçırıp
 * seri kırılsa bile rank DÜŞMEZ, kazanılmış gibi kalır.
 * Rozetteki `🔥 N Gün` GÜNCEL seridir; rank en iyi seriden gelir — ikisi ayrıdır.
 *
 * Eşikler bilinçle 3 günden başlar: bir gün oynamak lig atlatmaz
 * (kullanıcı: "ıvır zıvıra ödül olmasın"). Demir = başlangıç.
 * NOT: renkler mevcut token'lardan; Platin/Elmas ikisi de maviye düşüyor (yeni
 * token eklenmedi) — komşuları farklı olduğu için ayırt edilebilir.
 */

export interface SummonerTitle {
  /** Bu lig için gereken en az (en iyi) günlük seri */
  min: number
  title: string
  /** Emoji — gerçek LoL amblemi yüklenemezse fallback (RankEmblem `onError`) */
  icon: string
  /** LoL amblem dosya adı (iron/bronze/…/challenger) — CommunityDragon URL'i için */
  slug: string
  /** CSS renk değişkeni (index.css'te tanımlı) */
  color: string
  /** Liste panelinde gösterilen kısa açıklama */
  blurb: string
}

/**
 * LoL rank amblem URL'i (CommunityDragon, statik). 10 liğin hepsi 200 döner
 * (tarayıcıda doğrulandı). Büyük görsel (1280–2560px), küçük gösterilir; SW önbekler.
 */
const EMBLEM_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem'
export function emblemUrl(slug: string): string {
  return `${EMBLEM_BASE}/emblem-${slug}.png`
}

/** En düşükten en yükseğe. `min` = gün. KESİN ARTAN olmalı (test bunu korur). */
export const SUMMONER_TITLES: SummonerTitle[] = [
  { min: 0, title: 'Demir', icon: '🔩', slug: 'iron', color: 'var(--text-dim)', blurb: 'Yolculuk yeni başladı.' },
  { min: 3, title: 'Bronz', icon: '🥉', slug: 'bronze', color: 'var(--diff-hard)', blurb: 'Üç günlük seri.' },
  { min: 7, title: 'Gümüş', icon: '🥈', slug: 'silver', color: 'var(--text)', blurb: 'Bir haftalık seri!' },
  { min: 12, title: 'Altın', icon: '🥇', slug: 'gold', color: 'var(--gold)', blurb: 'Neredeyse iki hafta.' },
  { min: 20, title: 'Platin', icon: '💠', slug: 'platinum', color: 'var(--accent-endless)', blurb: 'Yirmi günlük istikrar.' },
  { min: 30, title: 'Zümrüt', icon: '💚', slug: 'emerald', color: 'var(--accent-done)', blurb: 'Bir aylık sadakat.' },
  { min: 45, title: 'Elmas', icon: '💎', slug: 'diamond', color: 'var(--accent-endless)', blurb: 'Kırk beş gün hiç kaçmadan.' },
  { min: 65, title: 'Usta', icon: '🔮', slug: 'master', color: 'var(--accent-mystic)', blurb: 'İki aya yakın her gün.' },
  { min: 90, title: 'Büyük Usta', icon: '⚡', slug: 'grandmaster', color: 'var(--accent-timed)', blurb: 'Doksan günlük azim.' },
  { min: 120, title: 'Şampiyon', icon: '👑', slug: 'challenger', color: 'var(--gold-bright)', blurb: 'Yüz yirmi günlük efsane.' },
]

/** Verilen (en iyi) gün serisine karşılık gelen lig (eşiği geçen EN YÜKSEK). */
export function titleFor(bestStreakDays: number): SummonerTitle {
  for (let i = SUMMONER_TITLES.length - 1; i >= 0; i--) {
    if (bestStreakDays >= SUMMONER_TITLES[i].min) return SUMMONER_TITLES[i]
  }
  return SUMMONER_TITLES[0] // min:0 hep var → teorik olarak buraya düşülmez
}

/** Bir sonraki lig (ilerleme çubuğu için). Zirvedeyse `null`. */
export function nextTitle(bestStreakDays: number): SummonerTitle | null {
  return SUMMONER_TITLES.find((t) => t.min > bestStreakDays) ?? null
}
