import { CHAMPIONS } from './data'
import { getChallengeWins } from './challenge'
import { getDailyHistory, getDailyStreak, getStats, isStreakAlive, type ModeStats } from './stats'
import { SUB_MODES, DIFFICULTIES, type SubMode, type TopMode, type Difficulty } from './types'

// ---- localStorage depoları ----

/** Kazanılan rozetler: { id: "YYYY-MM-DD" } */
const ACH_KEY = 'vt:ach'

/** Bilinen farklı şampiyon id listesi (çoklu sayım yok) */
const CHAMP_WINS_KEY = 'vt:champwins'

// ---- Kazanılmış şampiyon kaydı ----

export function getChampWins(): string[] {
  try {
    const raw = localStorage.getItem(CHAMP_WINS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch { return [] }
}

export function recordChampWin(champId: string) {
  const list = getChampWins()
  if (!list.includes(champId)) {
    list.push(champId)
    localStorage.setItem(CHAMP_WINS_KEY, JSON.stringify(list))
  }
}

// ---- Snapshot: tüm verileri tek seferde topla ----

export interface AchSnapshot {
  /** Her (top, sub, diff) kombinasyonunun ModeStats'ı */
  stats: { top: TopMode; sub: string; diff: Difficulty; s: ModeStats }[]
  /** Toplam oynanan oyun (tüm modlar) */
  totalPlayed: number
  /** Toplam kazanılan oyun */
  totalWon: number
  /** Bir tahminde bilme var mı? */
  hasFirstTry: boolean
  /** Toplam ilk tahminde bilme sayısı */
  totalFirstTry: number
  /** Ardışık ilk-tahmin bilme en iyisi */
  bestFirstTryStreak: number
  /** Herhangi bir modda en iyi kazanma serisi */
  bestWinStreak: number
  /** Günlük gün serisi */
  dailyStreak: { streak: number; best: number; alive: boolean }
  /** Günlük tarihçe (takvim verisi) */
  dailyHistory: Record<string, Partial<Record<SubMode, number>>>
  /** Farklı şampiyon sayısı (bilinen) */
  uniqueChamps: number
  /** Meydan okuma galibiyeti sayısı */
  challengeWins: number
  /** Herhangi bir modda Aşırı Zor'da kazanılan oyun var mı? */
  hasInsaneWin: boolean
  /** Aşırı Zor'da toplam kazanılan oyun */
  insaneWins: number
  /** Zor'da toplam kazanılan oyun */
  hardWins: number
  /** Herhangi bir Zamana Karşı turunda 10+ skor var mı? */
  hasTimed10: boolean
  /** Herhangi bir Zamana Karşı turunda 15+ skor var mı? */
  hasTimed15: boolean
  /** Herhangi bir Zamana Karşı turunda 20+ skor var mı? */
  hasTimed20: boolean
  /** Herhangi bir combo 8+ var mı? */
  hasCombo8: boolean
  /** Herhangi bir combo 12+ var mı? */
  hasCombo12: boolean
  /** 6 alt modun tümünde en az bir galibiyet var mı? */
  allSubsWon: boolean
  /** Karışık modda toplam kazanılan oyun */
  mixWon: number
  /** Toplam Zamana Karşı tur sayısı */
  timedRuns: number
  /** Günlük tarihçedeki gün sayısı (kaç gün oynandı) */
  totalDailyDays: number
}

export function buildSnapshot(): AchSnapshot {
  const tops: TopMode[] = ['endless', 'timed', 'daily']
  const subs = [...SUB_MODES.map((m) => m.id), 'mix'] as string[]
  const diffs = DIFFICULTIES.map((d) => d.id)

  const allStats: AchSnapshot['stats'] = []
  let totalPlayed = 0
  let totalWon = 0
  let hasFirstTry = false
  let totalFirstTry = 0
  let bestFirstTryStreak = 0
  let bestWinStreak = 0
  let hasInsaneWin = false
  let insaneWins = 0
  let hardWins = 0
  let hasTimed10 = false
  let hasTimed15 = false
  let hasTimed20 = false
  let hasCombo8 = false
  let hasCombo12 = false
  let mixWon = 0
  let timedRuns = 0

  for (const top of tops) {
    for (const sub of subs) {
      for (const diff of diffs) {
        const s = getStats(top, sub as any, diff)
        allStats.push({ top, sub, diff, s })
        totalPlayed += s.played
        totalWon += s.won
        totalFirstTry += s.firstTry
        if (s.firstTry > 0) hasFirstTry = true
        if (s.bestFirstTryStreak > bestFirstTryStreak) bestFirstTryStreak = s.bestFirstTryStreak
        if (s.bestStreak > bestWinStreak) bestWinStreak = s.bestStreak
        if (diff === 'insane' && s.won > 0) { hasInsaneWin = true; insaneWins += s.won }
        if (diff === 'hard' && s.won > 0) hardWins += s.won
        if (sub === 'mix') mixWon += s.won
        if (top === 'timed') timedRuns += s.played
      }
    }
  }

  // Zamana Karşı skorlar: getBestScore her (sub, diff) için ayrı
  for (const sub of subs) {
    for (const diff of diffs) {
      const best = Number(localStorage.getItem(`vt:best:${sub}:${diff}`) ?? 0)
      if (best >= 10) hasTimed10 = true
      if (best >= 15) hasTimed15 = true
      if (best >= 20) hasTimed20 = true
      const combo = Number(localStorage.getItem(`vt:combo:${sub}:${diff}`) ?? 0)
      if (combo >= 8) hasCombo8 = true
      if (combo >= 12) hasCombo12 = true
    }
  }

  // 6 alt modun tümünde galibiyet (gerçek 6 SubMode — mix hariç)
  const subWins = new Set<SubMode>()
  for (const sub of SUB_MODES) {
    for (const top of tops) {
      for (const diff of diffs) {
        const s = getStats(top, sub.id, diff)
        if (s.won > 0) subWins.add(sub.id)
      }
    }
  }

  const streak = getDailyStreak()
  const dailyHistory = getDailyHistory()

  return {
    stats: allStats,
    totalPlayed,
    totalWon,
    hasFirstTry,
    totalFirstTry,
    bestFirstTryStreak,
    bestWinStreak,
    dailyStreak: { streak: streak.streak, best: streak.best, alive: isStreakAlive(streak) },
    dailyHistory,
    uniqueChamps: getChampWins().length,
    challengeWins: getChallengeWins(),
    hasInsaneWin,
    insaneWins,
    hardWins,
    hasTimed10,
    hasTimed15,
    hasTimed20,
    hasCombo8,
    hasCombo12,
    allSubsWon: subWins.size >= 6,
    mixWon,
    timedRuns,
    totalDailyDays: Object.keys(dailyHistory).length,
  }
}

// ---- Rozet tanımları ----

export interface Achievement {
  id: string
  icon: string
  name: string
  desc: string
  /** Kategori — vitrin'de gruplama için */
  cat: 'temel' | 'seri' | 'tahmin' | 'cesitlilik' | 'hiz' | 'azim' | 'zorluk' | 'koleksiyon' | 'sosyal'
  /** Kazanıldı mı */
  check: (snap: AchSnapshot) => boolean
  /** İlerleme (opsiyonel — vitrin'de çubuk gösterilir) */
  progress?: (snap: AchSnapshot) => { current: number; target: number }
}

/** Kategori etiketleri — vitrin başlıkları */
export const ACH_CATEGORIES: { id: Achievement['cat']; label: string; icon: string }[] = [
  { id: 'temel', label: 'Temel', icon: '⭐' },
  { id: 'seri', label: 'Günlük Seri', icon: '📆' },
  { id: 'tahmin', label: 'Tahmin Ustalığı', icon: '🎯' },
  { id: 'cesitlilik', label: 'Çeşitlilik', icon: '🎰' },
  { id: 'hiz', label: 'Zamana Karşı', icon: '⚡' },
  { id: 'azim', label: 'Azim', icon: '💪' },
  { id: 'zorluk', label: 'Zorluk', icon: '☠️' },
  { id: 'koleksiyon', label: 'Koleksiyon', icon: '📚' },
  { id: 'sosyal', label: 'Sosyal', icon: '⚔️' },
]

export const ACHIEVEMENTS: Achievement[] = [
  // ═══ Temel ═══
  {
    id: 'first_blood', icon: '🩸', name: 'İlk Kan', cat: 'temel',
    desc: 'İlk galibiyetini kazan',
    check: (s) => s.totalWon > 0,
  },
  {
    id: 'apprentice', icon: '🌱', name: 'Çırak', cat: 'temel',
    desc: 'Toplam 10 oyun kazan',
    check: (s) => s.totalWon >= 10,
    progress: (s) => ({ current: Math.min(s.totalWon, 10), target: 10 }),
  },
  {
    id: 'master', icon: '⭐', name: 'Usta', cat: 'temel',
    desc: 'Toplam 50 oyun kazan',
    check: (s) => s.totalWon >= 50,
    progress: (s) => ({ current: Math.min(s.totalWon, 50), target: 50 }),
  },
  {
    id: 'legend', icon: '👑', name: 'Efsane', cat: 'temel',
    desc: 'Toplam 250 oyun kazan',
    check: (s) => s.totalWon >= 250,
    progress: (s) => ({ current: Math.min(s.totalWon, 250), target: 250 }),
  },

  // ═══ Günlük seri ═══
  {
    id: 'habit', icon: '📆', name: 'Alışkanlık', cat: 'seri',
    desc: '3 gün üst üste günlük oyna',
    check: (s) => s.dailyStreak.best >= 3,
    progress: (s) => ({ current: Math.min(s.dailyStreak.alive ? s.dailyStreak.streak : 0, 3), target: 3 }),
  },
  {
    id: 'loyal', icon: '🔥', name: 'Sadık', cat: 'seri',
    desc: '7 gün üst üste günlük oyna',
    check: (s) => s.dailyStreak.best >= 7,
    progress: (s) => ({ current: Math.min(s.dailyStreak.alive ? s.dailyStreak.streak : 0, 7), target: 7 }),
  },
  {
    id: 'marathon', icon: '🏃', name: 'Maraton', cat: 'seri',
    desc: '30 gün üst üste günlük oyna',
    check: (s) => s.dailyStreak.best >= 30,
    progress: (s) => ({ current: Math.min(s.dailyStreak.alive ? s.dailyStreak.streak : 0, 30), target: 30 }),
  },
  {
    id: 'daily_veteran', icon: '🗓️', name: 'Günlük Emektarı', cat: 'seri',
    desc: 'Toplam 50 farklı günde günlük oyna',
    check: (s) => s.totalDailyDays >= 50,
    progress: (s) => ({ current: Math.min(s.totalDailyDays, 50), target: 50 }),
  },

  // ═══ Tahmin ustalığı ═══
  {
    id: 'one_shot', icon: '🎯', name: 'Tek Atış', cat: 'tahmin',
    desc: 'İlk tahminde bil',
    check: (s) => s.hasFirstTry,
  },
  {
    id: 'sniper', icon: '🔫', name: 'Keskin Nişancı', cat: 'tahmin',
    desc: 'Üst üste 3 kez ilk tahminde bil',
    check: (s) => s.bestFirstTryStreak >= 3,
  },
  {
    id: 'laser', icon: '🔴', name: 'Lazer', cat: 'tahmin',
    desc: 'Üst üste 5 kez ilk tahminde bil',
    check: (s) => s.bestFirstTryStreak >= 5,
  },
  {
    id: 'bullseye', icon: '💎', name: 'Tam İsabet', cat: 'tahmin',
    desc: 'Toplamda 25 kez ilk tahminde bil',
    check: (s) => s.totalFirstTry >= 25,
    progress: (s) => ({ current: Math.min(s.totalFirstTry, 25), target: 25 }),
  },
  {
    id: 'streak5', icon: '🔥', name: 'Seri Katil', cat: 'tahmin',
    desc: 'Bir modda üst üste 5 oyun kazan',
    check: (s) => s.bestWinStreak >= 5,
  },
  {
    id: 'streak15', icon: '💥', name: 'Yenilmez', cat: 'tahmin',
    desc: 'Bir modda üst üste 15 oyun kazan',
    check: (s) => s.bestWinStreak >= 15,
    progress: (s) => ({ current: Math.min(s.bestWinStreak, 15), target: 15 }),
  },

  // ═══ Çeşitlilik ═══
  {
    id: 'six_shooter', icon: '🎰', name: 'Altı Silindir', cat: 'cesitlilik',
    desc: '6 alt modun tümünde en az 1 galibiyet',
    check: (s) => s.allSubsWon,
  },
  {
    id: 'full_day', icon: '📅', name: 'Tam Gün', cat: 'cesitlilik',
    desc: 'Bir günde 6 günlük bulmacanın hepsini kazan',
    check: (s) => {
      for (const day of Object.values(s.dailyHistory)) {
        const subs = Object.keys(day) as SubMode[]
        if (subs.length >= 6) return true
      }
      return false
    },
  },
  {
    id: 'mix_lover', icon: '🎲', name: 'Karışık Sever', cat: 'cesitlilik',
    desc: 'Karışık modda 10 oyun kazan',
    check: (s) => s.mixWon >= 10,
    progress: (s) => ({ current: Math.min(s.mixWon, 10), target: 10 }),
  },
  {
    id: 'mix_master', icon: '🌀', name: 'Karışık Ustası', cat: 'cesitlilik',
    desc: 'Karışık modda 50 oyun kazan',
    check: (s) => s.mixWon >= 50,
    progress: (s) => ({ current: Math.min(s.mixWon, 50), target: 50 }),
  },

  // ═══ Zamana Karşı ═══
  {
    id: 'speed_master', icon: '⚡', name: 'Hız Ustası', cat: 'hiz',
    desc: 'Zamana Karşı bir turda 10+ doğru',
    check: (s) => s.hasTimed10,
  },
  {
    id: 'light_speed', icon: '💫', name: 'Işık Hızı', cat: 'hiz',
    desc: 'Zamana Karşı bir turda 15+ doğru',
    check: (s) => s.hasTimed15,
  },
  {
    id: 'supersonic', icon: '🚀', name: 'Süper Sonik', cat: 'hiz',
    desc: 'Zamana Karşı bir turda 20+ doğru',
    check: (s) => s.hasTimed20,
  },
  {
    id: 'unstoppable', icon: '🔗', name: 'Pas Geçmez', cat: 'hiz',
    desc: `Zamana Karşı bir turda 8+ pas'sız seri`,
    check: (s) => s.hasCombo8,
  },
  {
    id: 'chain_master', icon: '⛓️', name: 'Zincir Ustası', cat: 'hiz',
    desc: `Zamana Karşı bir turda 12+ pas'sız seri`,
    check: (s) => s.hasCombo12,
  },
  {
    id: 'timed_veteran', icon: '⏱️', name: 'Süre Emektarı', cat: 'hiz',
    desc: 'Zamana Karşı toplamda 50 tur oyna',
    check: (s) => s.timedRuns >= 50,
    progress: (s) => ({ current: Math.min(s.timedRuns, 50), target: 50 }),
  },

  // ═══ Azim ═══
  {
    id: 'dedicated', icon: '💪', name: 'Azimli', cat: 'azim',
    desc: 'Toplamda 100 oyun oyna',
    check: (s) => s.totalPlayed >= 100,
    progress: (s) => ({ current: Math.min(s.totalPlayed, 100), target: 100 }),
  },
  {
    id: 'addicted', icon: '🎮', name: 'Bağımlı', cat: 'azim',
    desc: 'Toplamda 500 oyun oyna',
    check: (s) => s.totalPlayed >= 500,
    progress: (s) => ({ current: Math.min(s.totalPlayed, 500), target: 500 }),
  },
  {
    id: 'veteran', icon: '🎖️', name: 'Veteran', cat: 'azim',
    desc: 'Toplamda 1000 oyun oyna',
    check: (s) => s.totalPlayed >= 1000,
    progress: (s) => ({ current: Math.min(s.totalPlayed, 1000), target: 1000 }),
  },

  // ═══ Zorluk ═══
  {
    id: 'fearless', icon: '☠️', name: 'Gözü Kara', cat: 'zorluk',
    desc: 'Aşırı Zor zorlukta bir oyun kazan',
    check: (s) => s.hasInsaneWin,
  },
  {
    id: 'hard_grinder', icon: '🗡️', name: 'Zor Bela', cat: 'zorluk',
    desc: 'Zor zorlukta toplam 10 oyun kazan',
    check: (s) => s.hardWins >= 10,
    progress: (s) => ({ current: Math.min(s.hardWins, 10), target: 10 }),
  },
  {
    id: 'iron_will', icon: '🛡️', name: 'Demir İrade', cat: 'zorluk',
    desc: 'Aşırı Zor zorlukta toplam 10 oyun kazan',
    check: (s) => s.insaneWins >= 10,
    progress: (s) => ({ current: Math.min(s.insaneWins, 10), target: 10 }),
  },

  // ═══ Koleksiyon ═══
  {
    id: 'hunter', icon: '🏹', name: 'Avcı', cat: 'koleksiyon',
    desc: '50 farklı şampiyonu bil',
    check: (s) => s.uniqueChamps >= 50,
    progress: (s) => ({ current: Math.min(s.uniqueChamps, 50), target: 50 }),
  },
  {
    id: 'collector', icon: '📚', name: 'Koleksiyoncu', cat: 'koleksiyon',
    desc: '100 farklı şampiyonu bil',
    check: (s) => s.uniqueChamps >= 100,
    progress: (s) => ({ current: Math.min(s.uniqueChamps, 100), target: 100 }),
  },
  {
    id: 'encyclopedia', icon: '📖', name: 'Ansiklopedi', cat: 'koleksiyon',
    desc: `Tüm ${CHAMPIONS.length} şampiyonu bil`,
    check: (s) => s.uniqueChamps >= CHAMPIONS.length,
    progress: (s) => ({ current: Math.min(s.uniqueChamps, CHAMPIONS.length), target: CHAMPIONS.length }),
  },

  // ═══ Sosyal ═══
  {
    id: 'challenger', icon: '⚔️', name: 'Meydan Okuyucu', cat: 'sosyal',
    desc: 'Bir meydan okumayı kazan',
    check: (s) => s.challengeWins >= 1,
  },
  {
    id: 'gladiator', icon: '🏟️', name: 'Gladyatör', cat: 'sosyal',
    desc: '5 meydan okuma kazan',
    check: (s) => s.challengeWins >= 5,
    progress: (s) => ({ current: Math.min(s.challengeWins, 5), target: 5 }),
  },
  {
    id: 'champion', icon: '🏆', name: 'Şampiyon', cat: 'sosyal',
    desc: '15 meydan okuma kazan',
    check: (s) => s.challengeWins >= 15,
    progress: (s) => ({ current: Math.min(s.challengeWins, 15), target: 15 }),
  },
]

// ---- Kazanılmış rozet deposu ----

interface AchStore {
  [id: string]: string // id → kazanım tarihi "YYYY-MM-DD"
}

function getAchStore(): AchStore {
  try {
    const raw = localStorage.getItem(ACH_KEY)
    return raw ? (JSON.parse(raw) as AchStore) : {}
  } catch { return {} }
}

function saveAchStore(store: AchStore) {
  localStorage.setItem(ACH_KEY, JSON.stringify(store))
}

export interface EarnedAchievement {
  ach: Achievement
  date: string
}

/** Daha önce kazanılmış tüm rozetleri tarihiyle döndür */
export function getEarnedAchievements(): EarnedAchievement[] {
  const store = getAchStore()
  return ACHIEVEMENTS
    .filter((a) => a.id in store)
    .map((a) => ({ ach: a, date: store[a.id] }))
}

/**
 * Snapshot'ı kontrol edip henüz kazanılmamış ama artık şartı sağlayan
 * rozetleri kaydet ve yeni kazanılanların listesini döndür.
 */
export function evaluateAchievements(): EarnedAchievement[] {
  const snap = buildSnapshot()
  const store = getAchStore()
  const today = new Date().toISOString().slice(0, 10)
  const newlyEarned: EarnedAchievement[] = []

  for (const ach of ACHIEVEMENTS) {
    if (ach.id in store) continue // zaten kazanılmış
    if (ach.check(snap)) {
      store[ach.id] = today
      newlyEarned.push({ ach, date: today })
    }
  }

  if (newlyEarned.length > 0) saveAchStore(store)
  return newlyEarned
}

/**
 * Vitrin için: tüm rozetleri kazanılma bilgisiyle döndür.
 * Kazanılmayanlar için ilerleme verisi de dahil.
 */
export function getAchievementShowcase(): {
  ach: Achievement
  earned: boolean
  date?: string
  progress?: { current: number; target: number }
}[] {
  const store = getAchStore()
  const snap = buildSnapshot()
  return ACHIEVEMENTS.map((ach) => ({
    ach,
    earned: ach.id in store,
    date: store[ach.id],
    progress: ach.progress?.(snap),
  }))
}
