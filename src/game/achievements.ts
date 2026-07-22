import { CHAMPIONS } from './data'
import { getChallengeWins } from './challenge'
import { todayKey } from './rng'
import { getDailyHistory, getDailyStreak, getStats, isStreakAlive, normalizeEntry, type DailyHistory, type ModeStats } from './stats'
import { DAILY_SUBS, SUB_MODES, DIFFICULTIES, type PlaySub, type TopMode, type Difficulty } from './types'

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
  dailyHistory: DailyHistory
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
  /** Mini oyun — Kelime toplam galibiyet */
  wordleWins: number
  /** Mini oyun — Kelime en az denemeyle kazanma (küçük daha iyi) */
  wordleBestTries: number
  /** Mini oyun — Bingo bir turda doldurulan en fazla kutu (12 = tam kart) */
  bingoBest: number
  /** Mini oyun — Bingo tam kart (12/12) tamamlama sayısı */
  bingoWins: number
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
    // Günlük'te zorluk YOK: statsKey `diff`'i yok sayıp tek anahtara yazar
    // (`vt:stats:daily:{sub}`). Dört zorluk için dönmek AYNI kaydı dört kez
    // saymak olur ve üstelik Aşırı Zor/Zor rozetlerini Günlük oynayınca açardı.
    // Günlük hep normal kurallarla oynanır (bkz. rulesFor), o yüzden tek tur.
    const topDiffs: Difficulty[] = top === 'daily' ? ['normal'] : diffs
    for (const sub of subs) {
      for (const diff of topDiffs) {
        const s = getStats(top, sub as PlaySub, diff)
        allStats.push({ top, sub, diff, s })
        totalPlayed += s.played
        totalWon += s.won
        totalFirstTry += s.firstTry
        if (s.firstTry > 0) hasFirstTry = true
        if (s.bestFirstTryStreak > bestFirstTryStreak) bestFirstTryStreak = s.bestFirstTryStreak
        if (s.bestStreak > bestWinStreak) bestWinStreak = s.bestStreak
        // Zorluk rozetleri yalnız zorluk seçilebilen modlardan beslenir
        if (top !== 'daily' && diff === 'insane' && s.won > 0) { hasInsaneWin = true; insaneWins += s.won }
        if (top !== 'daily' && diff === 'hard' && s.won > 0) hardWins += s.won
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

  // 6 alt modun tümünde galibiyet (gerçek 6 SubMode — mix sayılmaz).
  // Yukarıda toplanan allStats'tan türetilir: aynı veriyi ikinci kez okumaya gerek yok
  // ve Günlük'ün tek-tur kuralı burada da otomatik geçerli olur.
  const subWins = new Set<string>()
  for (const { sub, s } of allStats) {
    if (s.won > 0) subWins.add(sub)
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
    allSubsWon: SUB_MODES.every((m) => subWins.has(m.id)),
    mixWon,
    timedRuns,
    totalDailyDays: Object.keys(dailyHistory).length,
    wordleWins: num('vt:wordle:wins'),
    wordleBestTries: num('vt:wordle:bestTries', 99),
    bingoBest: num('vt:bingo:best'),
    bingoWins: num('vt:bingo:wins'),
  }
}

/** localStorage sayısal okuma — mini oyun kayıtları için kısa yardımcı */
function num(key: string, fallback = 0): number {
  return Number(localStorage.getItem(key) ?? fallback)
}

// ---- Rozet tanımları ----

export interface Achievement {
  id: string
  icon: string
  name: string
  desc: string
  /** Kategori — vitrin'de gruplama için */
  cat: 'temel' | 'seri' | 'tahmin' | 'cesitlilik' | 'hiz' | 'azim' | 'zorluk' | 'koleksiyon' | 'sosyal' | 'mini'
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
  { id: 'mini', label: 'Mini Oyunlar', icon: '🕹️' },
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
    // id DEĞİŞMEZ (kazanılmış rozetler `vt:ach`'ta id ile duruyor); ad/açıklama
    // mod sayısından türetiliyor ki yeni mod eklenince metin yalan olmasın.
    id: 'six_shooter', icon: '🎰', name: 'Tam Takım', cat: 'cesitlilik',
    desc: `${SUB_MODES.length} alt modun tümünde en az 1 galibiyet`,
    check: (s) => s.allSubsWon,
  },
  {
    id: 'full_day', icon: '📅', name: 'Tam Gün', cat: 'cesitlilik',
    desc: `Bir günde ${DAILY_SUBS.length} günlük bulmacanın hepsini kazan`,
    check: (s) => {
      for (const day of Object.values(s.dailyHistory)) {
        // g=0 = kaybedildi — "hepsini kazan" şartına sayılmaz
        const won = Object.values(day).filter((v) => (normalizeEntry(v)?.g ?? 0) > 0)
        if (won.length >= DAILY_SUBS.length) return true
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

  // ═══ Mini Oyunlar ═══
  {
    id: 'word_first', icon: '🔡', name: 'İlk Kelime', cat: 'mini',
    desc: 'Kelime oyununu ilk kez kazan',
    check: (s) => s.wordleWins >= 1,
  },
  {
    id: 'word_25', icon: '📖', name: 'Kelime Ustası', cat: 'mini',
    desc: 'Kelime oyununu 25 kez kazan',
    check: (s) => s.wordleWins >= 25,
    progress: (s) => ({ current: Math.min(s.wordleWins, 25), target: 25 }),
  },
  {
    id: 'word_ace', icon: '🎯', name: 'Keskin Zeka', cat: 'mini',
    desc: 'Kelime oyununu 3 veya daha az denemede bil',
    check: (s) => s.wordleBestTries <= 3,
  },
  {
    id: 'bingo_win', icon: '🎲', name: 'Bingocu', cat: 'mini',
    desc: 'Bingo’da bir turda 8+ kutu doldur',
    check: (s) => s.bingoBest >= 8,
    progress: (s) => ({ current: Math.min(s.bingoBest, 8), target: 8 }),
  },
  {
    id: 'bingo_perfect', icon: '💯', name: 'Tam Kart', cat: 'mini',
    desc: 'Bingo’da 12 kutunun hepsini süre dolmadan doldur',
    check: (s) => s.bingoBest >= 12 || s.bingoWins >= 1,
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
  // Yerel tarih (todayKey) — toISOString UTC verir, UTC+3'te gece 00:00-03:00
  // arası kazanılan rozet "dün" damgalanırdı. Günlük mod da aynı anahtarı kullanır.
  const today = todayKey()
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
 * Önce evaluateAchievements çalışır: istatistikler rozet özelliğinden ÖNCE
 * oluşmuş olabilir (veya oyun sonu tetiklemesi kaçmış olabilir) — şartı
 * sağlanan rozetler vitrin açılırken sessizce depoya işlenir ki dolu
 * ilerleme çubuklu rozetler silik görünmesin.
 */
export function getAchievementShowcase(): {
  ach: Achievement
  earned: boolean
  date?: string
  progress?: { current: number; target: number }
}[] {
  evaluateAchievements()
  const store = getAchStore()
  const snap = buildSnapshot()
  return ACHIEVEMENTS.map((ach) => ({
    ach,
    earned: ach.id in store,
    date: store[ach.id],
    progress: ach.progress?.(snap),
  }))
}
