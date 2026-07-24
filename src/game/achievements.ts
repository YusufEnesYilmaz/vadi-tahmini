import { CHAMPIONS } from './data'
import { getChallengeWins } from './challenge'
import { miniDailyDone, type MiniGameId } from './miniDaily'
import { todayKey } from './rng'
import { getDailyHistory, getDailyStreak, getFullDayStreak, getStats, isStreakAlive, normalizeEntry, type DailyHistory, type ModeStats } from './stats'
import { DAILY_SUBS, SUB_MODES, DIFFICULTIES, type PlaySub, type TopMode, type Difficulty } from './types'

// ---- localStorage depoları ----

/** Kazanılan rozetler: { id: "YYYY-MM-DD" } */
const ACH_KEY = 'vt:ach'

/** Bilinen farklı şampiyon id listesi (çoklu sayım yok) */
const CHAMP_WINS_KEY = 'vt:champwins'

/** İlk tahminde bilinen şampiyon id listesi */
const FIRST_TRY_CHAMPS_KEY = 'vt:firsttrychamps'

/** Aktif galibiyet serisinde/turunda bilinen şampiyon id listesi */
const STREAK_CHAMPS_KEY = 'vt:streak_champs'

// ---- Kazanılmış şampiyon kaydı ----

export function getChampWins(): string[] {
  try {
    const raw = localStorage.getItem(CHAMP_WINS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch { return [] }
}

export function getFirstTryChamps(): string[] {
  try {
    const raw = localStorage.getItem(FIRST_TRY_CHAMPS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch { return [] }
}

export function getStreakChamps(): string[] {
  try {
    const raw = localStorage.getItem(STREAK_CHAMPS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch { return [] }
}

export function resetStreakChamps() {
  try {
    localStorage.removeItem(STREAK_CHAMPS_KEY)
  } catch { /* yoksay */ }
}

export function recordStreakChampWin(champId: string) {
  const list = getStreakChamps()
  if (!list.includes(champId)) {
    list.push(champId)
    localStorage.setItem(STREAK_CHAMPS_KEY, JSON.stringify(list))
  }

  // Kombo 1: Rüzgârın Yolu (Yasuo + Yone aynı seride)
  if (list.includes('Yasuo') && list.includes('Yone')) {
    localStorage.setItem('vt:combo_wind_brothers', '1')
  }

  // Kombo 2: Kaos ve Katliam (Jinx + Vi + Ekko aynı seride)
  if (list.includes('Jinx') && list.includes('Vi') && list.includes('Ekko')) {
    localStorage.setItem('vt:combo_jinx_chaos', '1')
  }

  // Kombo 3: Ruh Toplayıcı (Thresh + Lucian + Senna aynı seride)
  if (list.includes('Thresh') && list.includes('Lucian') && list.includes('Senna')) {
    localStorage.setItem('vt:combo_chain_warden', '1')
  }
}

export function recordChampWin(champId: string, firstTry?: boolean) {
  const list = getChampWins()
  if (!list.includes(champId)) {
    list.push(champId)
    localStorage.setItem(CHAMP_WINS_KEY, JSON.stringify(list))
  }
  if (firstTry) {
    const ftList = getFirstTryChamps()
    if (!ftList.includes(champId)) {
      ftList.push(champId)
      localStorage.setItem(FIRST_TRY_CHAMPS_KEY, JSON.stringify(ftList))
    }
  }
  recordStreakChampWin(champId)
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
  /** Herhangi bir Zamana Karşı turunda 8+ skor var mı? */
  hasTimed8: boolean
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
  /** 6 alt modun tümünde en az 1 galibiyet var mı? */
  allSubsWon: boolean
  /** 9 alt modun her birinde en az 5 galibiyet var mı? */
  allSubs5Won: boolean
  /** 3 üst modun her birinde en az 10 galibiyet var mı? */
  allTops10Won: boolean
  /** Günlük modların 1. denemede bilinme haritası */
  dailyFirstMap: Record<string, boolean>
  /** Karışık modda toplam kazanılan oyun */
  mixWon: number
  /** Toplam Zamana Karşı tur sayısı */
  timedRuns: number
  /** Günlük tarihçedeki gün sayısı (kaç gün oynandı) */
  totalDailyDays: number
  /** Tam Gün serisi: üst üste tüm günlük modların tamamlandığı günler */
  fullDayStreak: { streak: number; best: number; alive: boolean }
  /** Bir günde tüm günlük bulmacalar ilk tahminde bilinmiş mi */
  dailyPerfect: boolean
  /** Herhangi bir Zamana Karşı turunda 5+ skor var mı? */
  hasTimed5: boolean
  /** 3 üst modun (endless, daily, timed) tümünde galibiyet var mı? */
  allTopsWon: boolean
  /** Replik modunda toplam kazanılan oyun */
  quoteWins: number
  /** Eşya modunda toplam kazanılan oyun */
  itemWins: number
  /** Bilinen tüm şampiyon ID'lerinin dizisi */
  champWins: string[]
  /** İlk tahminde bilinen şampiyon ID'lerinin dizisi */
  firstTryChamps: string[]
  /** Gece yarısı (00:00 - 05:00) kazanılmış oyun var mı */
  hasNightWin: boolean
  /** Son tahmin hakkında (son canı kala) kazanılmış oyun var mı */
  hasLastChanceWin: boolean
  /** Skor/sonuç paylaşma sayısı */
  shareCount: number
  /** Aynı seride Yasuo + Yone kombosu yapıldı mı */
  hasWindBrothersCombo: boolean
  /** Aynı seride Jinx + Vi + Ekko kombosu yapıldı mı */
  hasJinxChaosCombo: boolean
  /** Aynı seride Thresh + Lucian + Senna kombosu yapıldı mı */
  hasChainWardenCombo: boolean
  /** Mini oyun — Kelime toplam galibiyet */
  wordleWins: number
  /** Mini oyun — Kelime en az denemeyle kazanma (küçük daha iyi) */
  wordleBestTries: number
  /** Mini oyun — Bingo bir turda doldurulan en fazla kutu (12 = tam kart) */
  bingoBest: number
  /** Mini oyun — Bingo tam kart (12/12) tamamlama sayısı */
  bingoWins: number
  /** Mini oyun — Zaman Tüneli galibiyet sayısı */
  timelineWins: number
  /** Mini oyun — Zaman Tüneli en az deneme (küçük daha iyi; 1 = ilk denemede) */
  timelineBest: number
  /** Mini oyun — Şampiyon Avı galibiyet sayısı */
  huntWins: number
  /** Mini oyun — Şampiyon Avı en az tahminle bulma (küçük daha iyi) */
  huntBest: number
  /** Mini oyun — Dokuz Kare tamamlama sayısı */
  gridWins: number
  /** Mini oyun — Dokuz Kare hiç yanlışsız (kusursuz) tamamlama sayısı */
  gridPerfect: number
  /** Mini oyun — Bağlantılar galibiyet sayısı */
  connWins: number
  /** Mini oyun — Bağlantılar hiç yanlış onaysız (kusursuz) çözme sayısı */
  connPerfect: number
  /** Tüm 6 mini oyunda en az 1 galibiyet var mı */
  allMiniGamesWon: boolean
  /** Galibiyet alınan mini oyun sayısı (en fazla 6) */
  miniGamesWonCount: number
  /** En az 5 galibiyet alınan mini oyun sayısı (en fazla 6) */
  miniGames5Count: number
  /** Bugün tamamlanan günlük mini oyun sayısı (en fazla 6) */
  todayMiniDailyDoneCount: number
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
  let hasTimed5 = false
  let hasTimed8 = false
  let hasTimed10 = false
  let hasTimed15 = false
  let hasTimed20 = false
  let hasCombo8 = false
  let hasCombo12 = false
  let mixWon = 0
  let timedRuns = 0
  let quoteWins = 0
  let itemWins = 0

  for (const top of tops) {
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
        if (top !== 'daily' && diff === 'insane' && s.won > 0) { hasInsaneWin = true; insaneWins += s.won }
        if (top !== 'daily' && diff === 'hard' && s.won > 0) hardWins += s.won
        if (sub === 'mix') mixWon += s.won
        if (sub === 'quote') quoteWins += s.won
        if (sub === 'item') itemWins += s.won
        if (top === 'timed') timedRuns += s.played
      }
    }
  }

  for (const sub of subs) {
    for (const diff of diffs) {
      const best = Number(localStorage.getItem(`vt:best:${sub}:${diff}`) ?? 0)
      if (best >= 5) hasTimed5 = true
      if (best >= 8) hasTimed8 = true
      if (best >= 10) hasTimed10 = true
      if (best >= 15) hasTimed15 = true
      if (best >= 20) hasTimed20 = true
      const combo = Number(localStorage.getItem(`vt:combo:${sub}:${diff}`) ?? 0)
      if (combo >= 8) hasCombo8 = true
      if (combo >= 12) hasCombo12 = true
    }
  }

  const subWins = new Set<string>()
  const topWins = new Set<string>()
  const subWinCounts = new Map<string, number>()
  const topWinCounts = new Map<TopMode, number>()

  for (const { top, sub, s } of allStats) {
    if (s.won > 0) {
      subWins.add(sub)
      topWins.add(top)
      subWinCounts.set(sub, (subWinCounts.get(sub) ?? 0) + s.won)
      topWinCounts.set(top, (topWinCounts.get(top) ?? 0) + s.won)
    }
  }

  const streak = getDailyStreak()
  const dailyHistory = getDailyHistory()
  const fds = getFullDayStreak()

  const dailyFirstMap: Record<string, boolean> = {}
  for (const m of DAILY_SUBS) dailyFirstMap[m.id] = false
  for (const day of Object.values(dailyHistory)) {
    for (const m of DAILY_SUBS) {
      const entry = normalizeEntry(day[m.id])
      if (entry && entry.g === 1) dailyFirstMap[m.id] = true
    }
  }

  let dailyPerfect = false
  for (const day of Object.values(dailyHistory)) {
    const entries = DAILY_SUBS.map((m) => normalizeEntry(day[m.id]))
    if (entries.every((e) => e && e.g === 1)) { dailyPerfect = true; break }
  }

  const wordleWins = num('vt:wordle:wins')
  const wordleBestTries = num('vt:wordle:bestTries', 99)
  const bingoBest = num('vt:bingo:best')
  const bingoWins = num('vt:bingo:wins')
  const timelineWins = num('vt:timeline:wins')
  const timelineBest = num('vt:timeline:best', 99)
  const huntWins = num('vt:hunt:wins')
  const huntBest = num('vt:hunt:best', 99)
  const gridWins = num('vt:grid:wins')
  const gridPerfect = num('vt:grid:perfect')
  const connWins = num('vt:conn:wins')
  const connPerfect = num('vt:conn:perfect')

  const miniGames: MiniGameId[] = ['wordle', 'bingo', 'timeline', 'hunt', 'grid', 'connections']

  const miniWinMap: Record<MiniGameId, boolean> = {
    wordle: wordleWins >= 1,
    bingo: bingoWins >= 1 || bingoBest >= 8,
    timeline: timelineWins >= 1,
    hunt: huntWins >= 1,
    grid: gridWins >= 1,
    connections: connWins >= 1,
  }

  const miniWin5Map: Record<MiniGameId, boolean> = {
    wordle: wordleWins >= 5,
    bingo: bingoWins >= 5 || bingoBest >= 12,
    timeline: timelineWins >= 5,
    hunt: huntWins >= 5,
    grid: gridWins >= 5,
    connections: connWins >= 5,
  }

  const miniGamesWonCount = miniGames.filter((g) => miniWinMap[g]).length
  const allMiniGamesWon = miniGamesWonCount >= 6
  const miniGames5Count = miniGames.filter((g) => miniWin5Map[g]).length
  const todayMiniDailyDoneCount = miniGames.filter((g) => miniDailyDone(g)).length

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
    hasTimed5,
    hasTimed8,
    hasTimed10,
    hasTimed15,
    hasTimed20,
    hasCombo8,
    hasCombo12,
    allSubsWon: SUB_MODES.every((m) => subWins.has(m.id)),
    allSubs5Won: SUB_MODES.every((m) => (subWinCounts.get(m.id) ?? 0) >= 5),
    allTops10Won: (['endless', 'daily', 'timed'] as TopMode[]).every((t) => (topWinCounts.get(t) ?? 0) >= 10),
    dailyFirstMap,
    mixWon,
    timedRuns,
    totalDailyDays: Object.keys(dailyHistory).length,
    fullDayStreak: { streak: fds.streak, best: fds.best, alive: isStreakAlive(fds) },
    dailyPerfect,
    allTopsWon: (['endless', 'daily', 'timed'] as TopMode[]).every((t) => topWins.has(t)),
    quoteWins,
    itemWins,
    champWins: getChampWins(),
    firstTryChamps: getFirstTryChamps(),
    hasNightWin: localStorage.getItem('vt:nightwin') === '1',
    hasLastChanceWin: localStorage.getItem('vt:lastchance') === '1',
    shareCount: num('vt:sharecount'),
    hasWindBrothersCombo: localStorage.getItem('vt:combo_wind_brothers') === '1',
    hasJinxChaosCombo: localStorage.getItem('vt:combo_jinx_chaos') === '1',
    hasChainWardenCombo: localStorage.getItem('vt:combo_chain_warden') === '1',
    wordleWins,
    wordleBestTries,
    bingoBest,
    bingoWins,
    timelineWins,
    timelineBest,
    huntWins,
    huntBest,
    gridWins,
    gridPerfect,
    connWins,
    connPerfect,
    allMiniGamesWon,
    miniGamesWonCount,
    miniGames5Count,
    todayMiniDailyDoneCount,
  }
}

/** localStorage sayısal okuma — mini oyun kayıtları için kısa yardımcı */
function num(key: string, fallback = 0): number {
  return Number(localStorage.getItem(key) ?? fallback)
}

const REGION_ACH_IDS = [
  'demacia_fan', 'noxus_fan', 'ionia_master', 'freljord_fan',
  'piltover_zaun_fan', 'bilgewater_fan', 'shurima_fan', 'shadow_void_fan'
]

function regionAllCheck(s: AchSnapshot, region: string | string[]): boolean {
  const list = CHAMPIONS.filter((c) => Array.isArray(region) ? region.includes(c.region) : c.region === region)
  return list.length > 0 && list.every((c) => s.champWins.includes(c.id))
}

function isRegionComplete(id: string, s: AchSnapshot): boolean {
  if (id === 'demacia_fan') return regionAllCheck(s, 'Demacia')
  if (id === 'noxus_fan') return regionAllCheck(s, 'Noxus')
  if (id === 'ionia_master') return regionAllCheck(s, 'Ionia')
  if (id === 'freljord_fan') return regionAllCheck(s, 'Freljord')
  if (id === 'piltover_zaun_fan') return regionAllCheck(s, ['Piltover', 'Zaun'])
  if (id === 'bilgewater_fan') return regionAllCheck(s, 'Bilgewater')
  if (id === 'shurima_fan') return regionAllCheck(s, 'Shurima')
  if (id === 'shadow_void_fan') return regionAllCheck(s, ['Gölge Adaları', 'Boşluk'])
  return false
}

function isRuneterraConqueror(s: AchSnapshot): boolean {
  return REGION_ACH_IDS.every((id) => isRegionComplete(id, s))
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
    id: 'centurion', icon: '🏛️', name: 'Yüzbaşı', cat: 'temel',
    desc: 'Toplam 100 oyun kazan',
    check: (s) => s.totalWon >= 100,
    progress: (s) => ({ current: Math.min(s.totalWon, 100), target: 100 }),
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
    id: 'two_week', icon: '📆', name: 'İki Hafta', cat: 'seri',
    desc: '14 gün üst üste günlük oyna',
    check: (s) => s.dailyStreak.best >= 14,
    progress: (s) => ({ current: Math.min(s.dailyStreak.alive ? s.dailyStreak.streak : 0, 14), target: 14 }),
  },
  {
    id: 'daily_veteran', icon: '🗓️', name: 'Günlük Emektarı', cat: 'seri',
    desc: 'Toplam 50 farklı günde günlük oyna',
    check: (s) => s.totalDailyDays >= 50,
    progress: (s) => ({ current: Math.min(s.totalDailyDays, 50), target: 50 }),
  },
  {
    id: 'full_day_streak', icon: '🌟', name: 'Tam Günler', cat: 'seri',
    desc: '3 gün üst üste tüm günlük bulmacaları tamamla',
    check: (s) => s.fullDayStreak.best >= 3,
    progress: (s) => ({ current: Math.min(s.fullDayStreak.alive ? s.fullDayStreak.streak : 0, 3), target: 3 }),
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
    id: 'streak10', icon: '⚡', name: 'Durdurulamaz', cat: 'tahmin',
    desc: 'Bir modda üst üste 10 oyun kazan',
    check: (s) => s.bestWinStreak >= 10,
    progress: (s) => ({ current: Math.min(s.bestWinStreak, 10), target: 10 }),
  },
  {
    id: 'streak15', icon: '💥', name: 'Yenilmez', cat: 'tahmin',
    desc: 'Bir modda üst üste 15 oyun kazan',
    check: (s) => s.bestWinStreak >= 15,
    progress: (s) => ({ current: Math.min(s.bestWinStreak, 15), target: 15 }),
  },
  {
    id: 'last_chance', icon: '⌛', name: 'Son Nefes', cat: 'tahmin',
    desc: 'Son tahmin hakkında (1 canın kala) oyunu kazan',
    check: (s) => s.hasLastChanceWin,
  },

  // ═══ Çeşitlilik ═══
  {
    // id DEĞİŞMEZ (kazanılmış rozetler `vt:ach`'ta id ile duruyor); ad/açıklama
    // mod sayısından türetiliyor ki yeni mod eklenince metin yalan olmasın.
    id: 'six_shooter', icon: '🎰', name: 'Tam Takım', cat: 'cesitlilik',
    desc: `${SUB_MODES.length} alt modun her birinde en az 5 galibiyet`,
    check: (s) => s.allSubs5Won,
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
  {
    id: 'daily_perfect', icon: '💎', name: 'Kusursuz Gün', cat: 'cesitlilik',
    desc: 'Bir günde tüm günlük bulmacaları ilk tahminde bil',
    check: (s) => s.dailyPerfect,
  },
  {
    id: 'all_tops', icon: '🎪', name: 'Üçlü Taç', cat: 'cesitlilik',
    desc: 'Sınırsız, Günlük ve Zamana Karşı modlarının her birinde en az 10 galibiyet',
    check: (s) => s.allTops10Won,
  },
  {
    id: 'sound_hunter', icon: '🎧', name: 'Ses Avcısı', cat: 'cesitlilik',
    desc: 'Replik modunda toplam 15 oyun kazan',
    check: (s) => s.quoteWins >= 15,
    progress: (s) => ({ current: Math.min(s.quoteWins, 15), target: 15 }),
  },
  {
    id: 'item_master', icon: '🗡️', name: 'Eşya Uzmanı', cat: 'cesitlilik',
    desc: 'Eşya modunda toplam 50 oyun kazan',
    check: (s) => s.itemWins >= 50,
    progress: (s) => ({ current: Math.min(s.itemWins, 50), target: 50 }),
  },

  // ═══ Zamana Karşı ═══
  {
    id: 'speed_start', icon: '🏃', name: 'İlk Adım', cat: 'hiz',
    desc: 'Zamana Karşı bir turda 8+ doğru',
    check: (s) => s.hasTimed8,
  },
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
  {
    id: 'timed_100', icon: '🎯', name: 'Yüz Tur', cat: 'hiz',
    desc: 'Zamana Karşı toplamda 100 tur oyna',
    check: (s) => s.timedRuns >= 100,
    progress: (s) => ({ current: Math.min(s.timedRuns, 100), target: 100 }),
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
  {
    id: 'marathon_player', icon: '🏅', name: 'Maratoncu', cat: 'azim',
    desc: 'Toplamda 2500 oyun oyna',
    check: (s) => s.totalPlayed >= 2500,
    progress: (s) => ({ current: Math.min(s.totalPlayed, 2500), target: 2500 }),
  },
  {
    id: 'night_owl', icon: '🦉', name: 'Gece Kuşu', cat: 'azim',
    desc: 'Gece yarısı (00:00 - 05:00) bir oyun kazan',
    check: (s) => s.hasNightWin,
  },

  // ═══ Zorluk ═══
  {
    id: 'fearless', icon: '☠️', name: 'Gözü Kara', cat: 'zorluk',
    desc: 'Aşırı Zor zorlukta toplam 5 oyun kazan',
    check: (s) => s.insaneWins >= 5,
    progress: (s) => ({ current: Math.min(s.insaneWins, 5), target: 5 }),
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
  {
    id: 'hard_master', icon: '⚔️', name: 'Zor Ustası', cat: 'zorluk',
    desc: 'Zor zorlukta toplam 25 oyun kazan',
    check: (s) => s.hardWins >= 25,
    progress: (s) => ({ current: Math.min(s.hardWins, 25), target: 25 }),
  },
  {
    id: 'insane_legend', icon: '💀', name: 'Delilik Efsanesi', cat: 'zorluk',
    desc: 'Aşırı Zor zorlukta toplam 25 oyun kazan',
    check: (s) => s.insaneWins >= 25,
    progress: (s) => ({ current: Math.min(s.insaneWins, 25), target: 25 }),
  },

  // ═══ Koleksiyon ═══
  {
    id: 'explorer', icon: '🔍', name: 'Kaşif', cat: 'koleksiyon',
    desc: '25 farklı şampiyonu bil',
    check: (s) => s.uniqueChamps >= 25,
    progress: (s) => ({ current: Math.min(s.uniqueChamps, 25), target: 25 }),
  },
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
    id: 'grand_collector', icon: '🗃️', name: 'Büyük Koleksiyoncu', cat: 'koleksiyon',
    desc: '150 farklı şampiyonu bil',
    check: (s) => s.uniqueChamps >= 150,
    progress: (s) => ({ current: Math.min(s.uniqueChamps, 150), target: 150 }),
  },
  {
    id: 'encyclopedia', icon: '📖', name: 'Ansiklopedi', cat: 'koleksiyon',
    desc: `Tüm ${CHAMPIONS.length} şampiyonu bil`,
    check: (s) => s.uniqueChamps >= CHAMPIONS.length,
    progress: (s) => ({ current: Math.min(s.uniqueChamps, CHAMPIONS.length), target: CHAMPIONS.length }),
  },
  {
    id: 'shroom_hunter', icon: '🍄', name: 'Mantar Avcısı', cat: 'koleksiyon',
    desc: 'Teemo şampiyonunu tahmin et',
    check: (s) => s.champWins.includes('Teemo'),
  },
  {
    id: 'draven_league', icon: '🪓', name: 'Draven Ligi', cat: 'koleksiyon',
    desc: 'Draven şampiyonunu tahmin et',
    check: (s) => s.champWins.includes('Draven'),
  },

  {
    id: 'adc_main', icon: '🏹', name: 'Alt Koridor Muhafızı', cat: 'koleksiyon',
    desc: 'Alt koridordan en az 15 farklı şampiyonu doğru bil',
    check: (s) => CHAMPIONS.filter((c) => c.lanes.includes('Alt') && s.champWins.includes(c.id)).length >= 15,
    progress: (s) => ({
      current: Math.min(CHAMPIONS.filter((c) => c.lanes.includes('Alt') && s.champWins.includes(c.id)).length, 15),
      target: 15,
    }),
  },
  {
    id: 'top_main', icon: '🏔️', name: 'Üst Koridor Savaşçısı', cat: 'koleksiyon',
    desc: 'Üst koridordan en az 20 farklı şampiyonu doğru bil',
    check: (s) => CHAMPIONS.filter((c) => c.lanes.includes('Üst') && s.champWins.includes(c.id)).length >= 20,
    progress: (s) => ({
      current: Math.min(CHAMPIONS.filter((c) => c.lanes.includes('Üst') && s.champWins.includes(c.id)).length, 20),
      target: 20,
    }),
  },
  {
    id: 'mid_main', icon: '🔮', name: 'Vadi Büyücüsü', cat: 'koleksiyon',
    desc: 'Orta koridordan en az 20 farklı şampiyonu doğru bil',
    check: (s) => CHAMPIONS.filter((c) => c.lanes.includes('Orta') && s.champWins.includes(c.id)).length >= 20,
    progress: (s) => ({
      current: Math.min(CHAMPIONS.filter((c) => c.lanes.includes('Orta') && s.champWins.includes(c.id)).length, 20),
      target: 20,
    }),
  },
  {
    id: 'jungle_main', icon: '🌲', name: 'Orman Avcısı', cat: 'koleksiyon',
    desc: 'Orman koridorundan en az 20 farklı şampiyonu doğru bil',
    check: (s) => CHAMPIONS.filter((c) => c.lanes.includes('Orman') && s.champWins.includes(c.id)).length >= 20,
    progress: (s) => ({
      current: Math.min(CHAMPIONS.filter((c) => c.lanes.includes('Orman') && s.champWins.includes(c.id)).length, 20),
      target: 20,
    }),
  },
  {
    id: 'support_main', icon: '🛡️', name: 'Koruyucu Melek', cat: 'koleksiyon',
    desc: 'Destek koridorundan en az 15 farklı şampiyonu doğru bil',
    check: (s) => CHAMPIONS.filter((c) => c.lanes.includes('Destek') && s.champWins.includes(c.id)).length >= 15,
    progress: (s) => ({
      current: Math.min(CHAMPIONS.filter((c) => c.lanes.includes('Destek') && s.champWins.includes(c.id)).length, 15),
      target: 15,
    }),
  },
  {
    id: 'demacia_fan', icon: '🛡️', name: 'Demacia Adaleti', cat: 'koleksiyon',
    desc: 'Demacia bölgesindeki tüm şampiyonları doğru bil',
    check: (s) => {
      const list = CHAMPIONS.filter((c) => c.region === 'Demacia')
      return list.length > 0 && list.every((c) => s.champWins.includes(c.id))
    },
    progress: (s) => {
      const list = CHAMPIONS.filter((c) => c.region === 'Demacia')
      return { current: list.filter((c) => s.champWins.includes(c.id)).length, target: list.length }
    },
  },
  {
    id: 'noxus_fan', icon: '🏰', name: 'Noxus Neferi', cat: 'koleksiyon',
    desc: 'Noxus bölgesindeki tüm şampiyonları doğru bil',
    check: (s) => {
      const list = CHAMPIONS.filter((c) => c.region === 'Noxus')
      return list.length > 0 && list.every((c) => s.champWins.includes(c.id))
    },
    progress: (s) => {
      const list = CHAMPIONS.filter((c) => c.region === 'Noxus')
      return { current: list.filter((c) => s.champWins.includes(c.id)).length, target: list.length }
    },
  },
  {
    id: 'ionia_master', icon: '🌸', name: 'Ionia Bilgesi', cat: 'koleksiyon',
    desc: 'Ionia bölgesindeki tüm şampiyonları doğru bil',
    check: (s) => {
      const list = CHAMPIONS.filter((c) => c.region === 'Ionia')
      return list.length > 0 && list.every((c) => s.champWins.includes(c.id))
    },
    progress: (s) => {
      const list = CHAMPIONS.filter((c) => c.region === 'Ionia')
      return { current: list.filter((c) => s.champWins.includes(c.id)).length, target: list.length }
    },
  },
  {
    id: 'freljord_fan', icon: '❄️', name: 'Freljord Ayazı', cat: 'koleksiyon',
    desc: 'Freljord bölgesindeki tüm şampiyonları doğru bil',
    check: (s) => {
      const list = CHAMPIONS.filter((c) => c.region === 'Freljord')
      return list.length > 0 && list.every((c) => s.champWins.includes(c.id))
    },
    progress: (s) => {
      const list = CHAMPIONS.filter((c) => c.region === 'Freljord')
      return { current: list.filter((c) => s.champWins.includes(c.id)).length, target: list.length }
    },
  },
  {
    id: 'piltover_zaun_fan', icon: '⚙️', name: 'İnovasyon & Kimya', cat: 'koleksiyon',
    desc: 'Piltover ve Zaun bölgelerindeki tüm şampiyonları doğru bil',
    check: (s) => {
      const list = CHAMPIONS.filter((c) => c.region === 'Piltover' || c.region === 'Zaun')
      return list.length > 0 && list.every((c) => s.champWins.includes(c.id))
    },
    progress: (s) => {
      const list = CHAMPIONS.filter((c) => c.region === 'Piltover' || c.region === 'Zaun')
      return { current: list.filter((c) => s.champWins.includes(c.id)).length, target: list.length }
    },
  },
  {
    id: 'bilgewater_fan', icon: '🏴‍☠️', name: 'Korsan Koyu', cat: 'koleksiyon',
    desc: 'Bilgewater bölgesindeki tüm şampiyonları doğru bil',
    check: (s) => {
      const list = CHAMPIONS.filter((c) => c.region === 'Bilgewater')
      return list.length > 0 && list.every((c) => s.champWins.includes(c.id))
    },
    progress: (s) => {
      const list = CHAMPIONS.filter((c) => c.region === 'Bilgewater')
      return { current: list.filter((c) => s.champWins.includes(c.id)).length, target: list.length }
    },
  },
  {
    id: 'shurima_fan', icon: '🏜️', name: 'Güneş İmparatorluğu', cat: 'koleksiyon',
    desc: 'Shurima bölgesindeki tüm şampiyonları doğru bil',
    check: (s) => {
      const list = CHAMPIONS.filter((c) => c.region === 'Shurima')
      return list.length > 0 && list.every((c) => s.champWins.includes(c.id))
    },
    progress: (s) => {
      const list = CHAMPIONS.filter((c) => c.region === 'Shurima')
      return { current: list.filter((c) => s.champWins.includes(c.id)).length, target: list.length }
    },
  },
  {
    id: 'shadow_void_fan', icon: '👻', name: 'Karanlık Taraf', cat: 'koleksiyon',
    desc: 'Gölge Adaları ve Boşluk bölgelerindeki tüm şampiyonları doğru bil',
    check: (s) => {
      const list = CHAMPIONS.filter((c) => c.region === 'Gölge Adaları' || c.region === 'Boşluk')
      return list.length > 0 && list.every((c) => s.champWins.includes(c.id))
    },
    progress: (s) => {
      const list = CHAMPIONS.filter((c) => c.region === 'Gölge Adaları' || c.region === 'Boşluk')
      return { current: list.filter((c) => s.champWins.includes(c.id)).length, target: list.length }
    },
  },
  {
    id: 'runeterra_conqueror', icon: '👑', name: 'Runeterra Fatihi', cat: 'koleksiyon',
    desc: 'Oyundaki tüm 8 bölge başarımını %100 tamamla',
    check: (s) => isRuneterraConqueror(s),
    progress: (s) => ({
      current: REGION_ACH_IDS.filter((id) => isRegionComplete(id, s)).length,
      target: REGION_ACH_IDS.length,
    }),
  },
  {
    id: 'wind_brothers', icon: '⚔️', name: 'Rüzgârın Yolu', cat: 'koleksiyon',
    desc: 'Aynı galibiyet serisi içinde hem Yasuo hem Yone şampiyonunu doğru bil',
    check: (s) => s.hasWindBrothersCombo,
  },
  {
    id: 'jinx_chaos', icon: '💣', name: 'Kaos ve Katliam', cat: 'koleksiyon',
    desc: 'Aynı galibiyet serisi içinde Jinx, Vi ve Ekko şampiyonlarının üçünü de doğru bil',
    check: (s) => s.hasJinxChaosCombo,
  },
  {
    id: 'nine_tails', icon: '🦊', name: 'Dokuz Kuyruklu', cat: 'koleksiyon',
    desc: 'Ahri şampiyonunu ilk tahminde bil',
    check: (s) => s.firstTryChamps.includes('Ahri'),
  },
  {
    id: 'blind_monk', icon: '🥋', name: 'Kör Keşiş', cat: 'koleksiyon',
    desc: 'Lee Sin şampiyonunu ilk tahminde bil',
    check: (s) => s.firstTryChamps.includes('LeeSin'),
  },
  {
    id: 'chain_warden', icon: '🪝', name: 'Ruh Toplayıcı', cat: 'koleksiyon',
    desc: 'Aynı galibiyet serisi içinde Thresh, Lucian ve Senna şampiyonlarının üçünü de doğru bil',
    check: (s) => s.hasChainWardenCombo,
  },
  {
    id: 'arcane_legends', icon: '🎬', name: 'Arcane Efsaneleri', cat: 'koleksiyon',
    desc: 'Arcane dizisindeki tüm 10 şampiyonu (Jinx, Vi, Ekko, Caitlyn, Jayce, Viktor, Heimerdinger, Singed, Warwick, Ambessa) doğru bil',
    check: (s) => ['Jinx', 'Vi', 'Ekko', 'Caitlyn', 'Jayce', 'Viktor', 'Heimerdinger', 'Singed', 'Warwick', 'Ambessa'].every((id) => s.champWins.includes(id)),
    progress: (s) => {
      const list = ['Jinx', 'Vi', 'Ekko', 'Caitlyn', 'Jayce', 'Viktor', 'Heimerdinger', 'Singed', 'Warwick', 'Ambessa']
      return { current: list.filter((id) => s.champWins.includes(id)).length, target: list.length }
    },
  },

  // ═══ Sosyal ═══
  // `challengeWins` (vt:chwin) eskiden link tabanlı meydan okumadan geliyordu;
  // o özellik kaldırıldı (Faz 1b, 2026-07-24) — sayacı artık Kaç Tane? Multi tur
  // galibiyetleri artırıyor. id'ler DEĞİŞMEDİ: kazanılmış rozetler ve eski
  // galibiyetler aynen sayılır.
  {
    id: 'challenger', icon: '⚔️', name: 'Meydan Okuyucu', cat: 'sosyal',
    desc: "Kaç Tane? Multi'de bir tur kazan",
    check: (s) => s.challengeWins >= 1,
  },
  {
    id: 'rival', icon: '🤝', name: 'Rakip', cat: 'sosyal',
    desc: "Kaç Tane? Multi'de 3 tur kazan",
    check: (s) => s.challengeWins >= 3,
    progress: (s) => ({ current: Math.min(s.challengeWins, 3), target: 3 }),
  },
  {
    id: 'gladiator', icon: '🏟️', name: 'Gladyatör', cat: 'sosyal',
    desc: "Kaç Tane? Multi'de 5 tur kazan",
    check: (s) => s.challengeWins >= 5,
    progress: (s) => ({ current: Math.min(s.challengeWins, 5), target: 5 }),
  },
  {
    id: 'champion', icon: '🏆', name: 'Şampiyon', cat: 'sosyal',
    desc: "Kaç Tane? Multi'de 15 tur kazan",
    check: (s) => s.challengeWins >= 15,
    progress: (s) => ({ current: Math.min(s.challengeWins, 15), target: 15 }),
  },
  {
    id: 'social_butterfly', icon: '📣', name: 'Haberci', cat: 'sosyal',
    desc: 'Oyun sonucunu arkadaşlarınla 3 kez paylaş',
    check: (s) => s.shareCount >= 3,
    progress: (s) => ({ current: Math.min(s.shareCount, 3), target: 3 }),
  },

  // ═══ Günlük Dahi Başarımları ═══
  {
    id: 'daily_first_classic', icon: '🎯', name: 'Günlük Dahi: Klasik', cat: 'cesitlilik',
    desc: 'Günlük Klasik bulmacasını ilk tahminde bil',
    check: (s) => s.dailyFirstMap['classic'] ?? false,
  },
  {
    id: 'daily_first_ability', icon: '✨', name: 'Günlük Dahi: Yetenek', cat: 'cesitlilik',
    desc: 'Günlük Yetenek bulmacasını ilk tahminde bil',
    check: (s) => s.dailyFirstMap['ability'] ?? false,
  },
  {
    id: 'daily_first_art', icon: '🖼️', name: 'Günlük Dahi: Görsel', cat: 'cesitlilik',
    desc: 'Günlük Görsel bulmacasını ilk tahminde bil',
    check: (s) => s.dailyFirstMap['art'] ?? false,
  },
  {
    id: 'daily_first_skin', icon: '🎭', name: 'Günlük Dahi: Kostüm', cat: 'cesitlilik',
    desc: 'Günlük Kostüm bulmacasını ilk tahminde bil',
    check: (s) => s.dailyFirstMap['skin'] ?? false,
  },
  {
    id: 'daily_first_quote', icon: '🔊', name: 'Günlük Dahi: Replik', cat: 'cesitlilik',
    desc: 'Günlük Replik bulmacasını ilk tahminde bil',
    check: (s) => s.dailyFirstMap['quote'] ?? false,
  },
  {
    id: 'daily_first_emoji', icon: '😀', name: 'Günlük Dahi: Emoji', cat: 'cesitlilik',
    desc: 'Günlük Emoji bulmacasını ilk tahminde bil',
    check: (s) => s.dailyFirstMap['emoji'] ?? false,
  },
  {
    id: 'daily_first_silhouette', icon: '👤', name: 'Günlük Dahi: Silüet', cat: 'cesitlilik',
    desc: 'Günlük Silüet bulmacasını ilk tahminde bil',
    check: (s) => s.dailyFirstMap['silhouette'] ?? false,
  },
  {
    id: 'daily_first_story', icon: '📜', name: 'Günlük Dahi: Hikâye', cat: 'cesitlilik',
    desc: 'Günlük Hikâye bulmacasını ilk tahminde bil',
    check: (s) => s.dailyFirstMap['story'] ?? false,
  },
  {
    id: 'daily_first_item', icon: '🗡️', name: 'Günlük Dahi: Eşya', cat: 'cesitlilik',
    desc: 'Günlük Eşya bulmacasını ilk tahminde bil',
    check: (s) => s.dailyFirstMap['item'] ?? false,
  },

  // ═══ Mini Oyunlar ═══
  {
    id: 'word_first', icon: '🔡', name: 'İlk Kelime', cat: 'mini',
    desc: 'Kelime oyununu ilk kez kazan',
    check: (s) => s.wordleWins >= 1,
  },
  {
    id: 'word_10', icon: '📝', name: 'Kelime Maceracısı', cat: 'mini',
    desc: 'Kelime oyununu 10 kez kazan',
    check: (s) => s.wordleWins >= 10,
    progress: (s) => ({ current: Math.min(s.wordleWins, 10), target: 10 }),
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
  {
    id: 'bingo_10', icon: '🏆', name: 'Bingo Şampiyonu', cat: 'mini',
    desc: 'Bingo’da 10 kez tam kart tamamla',
    check: (s) => s.bingoWins >= 10,
    progress: (s) => ({ current: Math.min(s.bingoWins, 10), target: 10 }),
  },

  {
    id: 'timeline_first', icon: '🕰️', name: 'Zaman Yolcusu', cat: 'mini',
    desc: "Zaman Tüneli'nde bir sırayı tamamla",
    check: (s) => s.timelineWins >= 1,
  },
  {
    id: 'timeline_10', icon: '⌛', name: 'Zaman Mimarı', cat: 'mini',
    desc: "Zaman Tüneli'nde 10 galibiyet elde et",
    check: (s) => s.timelineWins >= 10,
    progress: (s) => ({ current: Math.min(s.timelineWins, 10), target: 10 }),
  },
  {
    id: 'timeline_perfect', icon: '📜', name: 'Tarih Kitabı', cat: 'mini',
    desc: "Zaman Tüneli'nde 5 şampiyonu İLK denemede doğru sırala",
    check: (s) => s.timelineBest <= 1,
  },

  {
    id: 'hunt_first', icon: '🐾', name: 'İz Sürücü', cat: 'mini',
    desc: "Şampiyon Avı'nda avı bul",
    check: (s) => s.huntWins >= 1,
  },
  {
    id: 'hunt_10', icon: '🏹', name: 'Avcı Ustası', cat: 'mini',
    desc: "Şampiyon Avı'nda 10 galibiyet elde et",
    check: (s) => s.huntWins >= 10,
    progress: (s) => ({ current: Math.min(s.huntWins, 10), target: 10 }),
  },
  {
    id: 'hunt_sharp', icon: '🦅', name: 'Keskin İzci', cat: 'mini',
    desc: "Şampiyon Avı'nda avı en fazla 4 denemede bitir",
    check: (s) => s.huntBest <= 4,
  },
  {
    id: 'hunt_sniper', icon: '🎯', name: 'Kör Nişancı', cat: 'mini',
    desc: "Şampiyon Avı'nda avı en fazla 2 denemede bitir",
    check: (s) => s.huntBest <= 2,
  },

  {
    id: 'grid_first', icon: '🔲', name: 'Kare Kare', cat: 'mini',
    desc: "Dokuz Kare'de 9 hücrenin hepsini doldur",
    check: (s) => s.gridWins >= 1,
  },
  {
    id: 'grid_10', icon: '📐', name: 'Izgara Mimarisi', cat: 'mini',
    desc: "Dokuz Kare'de 10 galibiyet elde et",
    check: (s) => s.gridWins >= 10,
    progress: (s) => ({ current: Math.min(s.gridWins, 10), target: 10 }),
  },
  {
    id: 'grid_perfect', icon: '🧠', name: 'Kusursuz Dokuz', cat: 'mini',
    desc: "Dokuz Kare'yi hiç yanlış deneme yapmadan tamamla",
    check: (s) => s.gridPerfect >= 1,
  },
  {
    id: 'grid_master', icon: '✨', name: 'Dokuzda Dokuz', cat: 'mini',
    desc: "Dokuz Kare'yi 3 kez hiç yanlış deneme yapmadan tamamla",
    check: (s) => s.gridPerfect >= 3,
    progress: (s) => ({ current: Math.min(s.gridPerfect, 3), target: 3 }),
  },

  {
    id: 'conn_first', icon: '🧩', name: 'Bağ Kurucu', cat: 'mini',
    desc: "Bağlantılar'da 4 grubun hepsini bul",
    check: (s) => s.connWins >= 1,
  },
  {
    id: 'conn_10', icon: '🌐', name: 'Zihin Ağları', cat: 'mini',
    desc: "Bağlantılar'da 10 galibiyet elde et",
    check: (s) => s.connWins >= 10,
    progress: (s) => ({ current: Math.min(s.connWins, 10), target: 10 }),
  },
  {
    id: 'conn_perfect', icon: '🔗', name: 'Dört Dörtlük', cat: 'mini',
    desc: "Bağlantılar'ı hiç yanlış onay vermeden çöz",
    check: (s) => s.connPerfect >= 1,
  },
  {
    id: 'conn_master', icon: '💎', name: 'Kusursuz Bağlar', cat: 'mini',
    desc: "Bağlantılar'ı 3 kez hiç yanlış onay vermeden çöz",
    check: (s) => s.connPerfect >= 3,
    progress: (s) => ({ current: Math.min(s.connPerfect, 3), target: 3 }),
  },

  // ═══ Meta Mini Oyun Başarımları ═══
  {
    id: 'mini_all_arounder', icon: '🌟', name: 'Mini Oyun Kaşifi', cat: 'mini',
    desc: '6 mini oyunun (Kelime, Bingo, Zaman Tüneli, Av, Dokuz Kare, Bağlantılar) hepsinde en az 1 galibiyet kazan',
    check: (s) => s.allMiniGamesWon,
    progress: (s) => ({ current: s.miniGamesWonCount, target: 6 }),
  },
  {
    id: 'mini_master', icon: '👑', name: 'Mini Oyun Üstadı', cat: 'mini',
    desc: '6 mini oyunun her birinde en az 5 galibiyet kazan',
    check: (s) => s.miniGames5Count >= 6,
    progress: (s) => ({ current: s.miniGames5Count, target: 6 }),
  },
  {
    id: 'mini_daily_marathon', icon: '📅', name: 'Günlük Altılı', cat: 'mini',
    desc: 'Tek bir günde 6 mini oyunun TÜM günlük bulmacalarını tamamla',
    check: (s) => s.todayMiniDailyDoneCount >= 6,
    progress: (s) => ({ current: s.todayMiniDailyDoneCount, target: 6 }),
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
