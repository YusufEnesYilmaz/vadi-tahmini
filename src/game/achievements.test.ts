import { describe, it, expect } from 'vitest'
import { ACHIEVEMENTS, buildSnapshot, getAchievementShowcase, type AchSnapshot } from './achievements'
import { DAILY_SUBS, SUB_MODES } from './types'

/** Minimal snapshot — varsayılanları override et */
function snap(overrides: Partial<AchSnapshot> = {}): AchSnapshot {
  return {
    stats: [],
    totalPlayed: 0,
    totalWon: 0,
    hasFirstTry: false,
    totalFirstTry: 0,
    bestFirstTryStreak: 0,
    bestWinStreak: 0,
    dailyStreak: { streak: 0, best: 0, alive: false },
    dailyHistory: {},
    uniqueChamps: 0,
    challengeWins: 0,
    hasInsaneWin: false,
    insaneWins: 0,
    hardWins: 0,
    hasTimed10: false,
    hasTimed15: false,
    hasTimed20: false,
    hasCombo8: false,
    hasCombo12: false,
    allSubsWon: false,
    mixWon: 0,
    timedRuns: 0,
    totalDailyDays: 0,
    wordleWins: 0,
    wordleBestTries: 99, // hiç kazanılmadı
    bingoBest: 0,
    bingoWins: 0,
    ...overrides,
  }
}

function find(id: string) {
  return ACHIEVEMENTS.find((a) => a.id === id)!
}

describe('Achievements — check functions', () => {
  // Temel
  it('first_blood: totalWon > 0', () => {
    expect(find('first_blood').check(snap())).toBe(false)
    expect(find('first_blood').check(snap({ totalWon: 1 }))).toBe(true)
  })

  it('apprentice/master/legend: galibiyet kademe', () => {
    expect(find('apprentice').check(snap({ totalWon: 9 }))).toBe(false)
    expect(find('apprentice').check(snap({ totalWon: 10 }))).toBe(true)
    expect(find('master').check(snap({ totalWon: 50 }))).toBe(true)
    expect(find('legend').check(snap({ totalWon: 250 }))).toBe(true)
  })

  // Günlük seri
  it('habit/loyal/marathon: seri thresholds', () => {
    expect(find('habit').check(snap({ dailyStreak: { streak: 2, best: 2, alive: true } }))).toBe(false)
    expect(find('habit').check(snap({ dailyStreak: { streak: 3, best: 3, alive: true } }))).toBe(true)
    expect(find('loyal').check(snap({ dailyStreak: { streak: 7, best: 7, alive: true } }))).toBe(true)
    expect(find('marathon').check(snap({ dailyStreak: { streak: 30, best: 30, alive: true } }))).toBe(true)
    // best yeterli (seri kopsa bile)
    expect(find('habit').check(snap({ dailyStreak: { streak: 0, best: 5, alive: false } }))).toBe(true)
  })

  it('daily_veteran: 50 farklı gunde', () => {
    expect(find('daily_veteran').check(snap({ totalDailyDays: 49 }))).toBe(false)
    expect(find('daily_veteran').check(snap({ totalDailyDays: 50 }))).toBe(true)
  })

  // Tahmin ustaligi
  it('one_shot + sniper + laser', () => {
    expect(find('one_shot').check(snap({ hasFirstTry: true }))).toBe(true)
    expect(find('sniper').check(snap({ bestFirstTryStreak: 3 }))).toBe(true)
    expect(find('sniper').check(snap({ bestFirstTryStreak: 2 }))).toBe(false)
    expect(find('laser').check(snap({ bestFirstTryStreak: 5 }))).toBe(true)
  })

  it('bullseye: 25 toplam ilk tahmin', () => {
    expect(find('bullseye').check(snap({ totalFirstTry: 24 }))).toBe(false)
    expect(find('bullseye').check(snap({ totalFirstTry: 25 }))).toBe(true)
  })

  it('streak5/streak15: kazanma serisi', () => {
    expect(find('streak5').check(snap({ bestWinStreak: 4 }))).toBe(false)
    expect(find('streak5').check(snap({ bestWinStreak: 5 }))).toBe(true)
    expect(find('streak15').check(snap({ bestWinStreak: 15 }))).toBe(true)
  })

  // Cesitlilik
  it('six_shooter + full_day', () => {
    expect(find('six_shooter').check(snap({ allSubsWon: true }))).toBe(true)

    // Gün kaydını mod listesinden üret: yeni alt mod eklenince test kendiliğinden uyar
    // Günlük geçmişi yalnız Günlük'te oynanabilen modları içerir
    const day = Object.fromEntries(DAILY_SUBS.map((m) => [m.id, 2]))
    expect(find('full_day').check(snap({ dailyHistory: { '2026-07-20': day } }))).toBe(true)
    expect(find('full_day').check(snap({ dailyHistory: { '2026-07-20': { classic: 2 } } }))).toBe(false)

    // 0 = kaybedildi: bir mod kaybedilmişse "hepsini kazan" sayılmaz
    const mixed = { ...day, [DAILY_SUBS[1].id]: 0 }
    expect(find('full_day').check(snap({ dailyHistory: { '2026-07-20': mixed } }))).toBe(false)
  })

  it('mix_lover/mix_master: karisik galibiyet', () => {
    expect(find('mix_lover').check(snap({ mixWon: 9 }))).toBe(false)
    expect(find('mix_lover').check(snap({ mixWon: 10 }))).toBe(true)
    expect(find('mix_master').check(snap({ mixWon: 50 }))).toBe(true)
  })

  // Zamana Karsi
  it('speed_master/light_speed/supersonic', () => {
    expect(find('speed_master').check(snap({ hasTimed10: true }))).toBe(true)
    expect(find('light_speed').check(snap({ hasTimed15: true }))).toBe(true)
    expect(find('supersonic').check(snap({ hasTimed20: true }))).toBe(true)
  })

  it('unstoppable/chain_master: combo', () => {
    expect(find('unstoppable').check(snap({ hasCombo8: true }))).toBe(true)
    expect(find('chain_master').check(snap({ hasCombo12: true }))).toBe(true)
  })

  it('timed_veteran: 50 tur', () => {
    expect(find('timed_veteran').check(snap({ timedRuns: 49 }))).toBe(false)
    expect(find('timed_veteran').check(snap({ timedRuns: 50 }))).toBe(true)
  })

  // Azim
  it('dedicated/addicted/veteran: oyun kademe', () => {
    expect(find('dedicated').check(snap({ totalPlayed: 100 }))).toBe(true)
    expect(find('addicted').check(snap({ totalPlayed: 500 }))).toBe(true)
    expect(find('veteran').check(snap({ totalPlayed: 1000 }))).toBe(true)
  })

  // Zorluk
  it('fearless/hard_grinder/iron_will', () => {
    expect(find('fearless').check(snap({ hasInsaneWin: true }))).toBe(true)
    expect(find('hard_grinder').check(snap({ hardWins: 9 }))).toBe(false)
    expect(find('hard_grinder').check(snap({ hardWins: 10 }))).toBe(true)
    expect(find('iron_will').check(snap({ insaneWins: 10 }))).toBe(true)
  })

  // Koleksiyon
  it('hunter/collector/encyclopedia', () => {
    expect(find('hunter').check(snap({ uniqueChamps: 50 }))).toBe(true)
    expect(find('collector').check(snap({ uniqueChamps: 100 }))).toBe(true)
    expect(find('encyclopedia').check(snap({ uniqueChamps: 999 }))).toBe(true)
  })

  // Sosyal
  it('challenger/gladiator/champion', () => {
    expect(find('challenger').check(snap({ challengeWins: 0 }))).toBe(false)
    expect(find('challenger').check(snap({ challengeWins: 1 }))).toBe(true)
    expect(find('gladiator').check(snap({ challengeWins: 5 }))).toBe(true)
    expect(find('champion').check(snap({ challengeWins: 15 }))).toBe(true)
  })
})

describe('Achievements — progress helpers', () => {
  it('habit progress aktif seriden okunur', () => {
    const p = find('habit').progress!(snap({ dailyStreak: { streak: 2, best: 2, alive: true } }))
    expect(p).toEqual({ current: 2, target: 3 })
  })

  it('habit progress seri olmusse 0', () => {
    const p = find('habit').progress!(snap({ dailyStreak: { streak: 5, best: 5, alive: false } }))
    expect(p).toEqual({ current: 0, target: 3 })
  })

  it('hunter progress cap', () => {
    const p = find('hunter').progress!(snap({ uniqueChamps: 200 }))
    expect(p).toEqual({ current: 50, target: 50 })
  })

  it('dedicated progress', () => {
    const p = find('dedicated').progress!(snap({ totalPlayed: 42 }))
    expect(p).toEqual({ current: 42, target: 100 })
  })

  it('apprentice progress', () => {
    const p = find('apprentice').progress!(snap({ totalWon: 7 }))
    expect(p).toEqual({ current: 7, target: 10 })
  })

  it('streak15 progress', () => {
    const p = find('streak15').progress!(snap({ bestWinStreak: 8 }))
    expect(p).toEqual({ current: 8, target: 15 })
  })
})

describe('Mini oyun rozetleri', () => {
  it('Kelime: ilk galibiyet / 25 galibiyet / 3 denemede', () => {
    expect(find('word_first').check(snap())).toBe(false)
    expect(find('word_first').check(snap({ wordleWins: 1 }))).toBe(true)
    expect(find('word_25').check(snap({ wordleWins: 24 }))).toBe(false)
    expect(find('word_25').check(snap({ wordleWins: 25 }))).toBe(true)
    expect(find('word_ace').check(snap({ wordleBestTries: 4 }))).toBe(false)
    expect(find('word_ace').check(snap({ wordleBestTries: 3 }))).toBe(true)
  })

  it('Bingo: 8+ kutu / tam kart', () => {
    expect(find('bingo_win').check(snap({ bingoBest: 7 }))).toBe(false)
    expect(find('bingo_win').check(snap({ bingoBest: 8 }))).toBe(true)
    expect(find('bingo_perfect').check(snap({ bingoBest: 11 }))).toBe(false)
    expect(find('bingo_perfect').check(snap({ bingoBest: 12 }))).toBe(true)
    expect(find('bingo_perfect').check(snap({ bingoWins: 1 }))).toBe(true)
  })
})

describe('ACHIEVEMENTS list integrity', () => {
  it('41 rozet tanımli', () => {
    expect(ACHIEVEMENTS).toHaveLength(41)
  })

  it('idler benzersiz', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('her rozette cat alani var', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.cat).toBeTruthy()
    }
  })
})

describe('getAchievementShowcase — geriye dönük eşitleme', () => {
  it('şartı sağlanan rozet vitrin açılışında kazanılmış sayılır ve depoya yazılır', () => {
    // Rozet özelliğinden ÖNCE oluşmuş istatistik senaryosu: 12 galibiyet, 5'lik seri
    localStorage.setItem('vt:stats:endless:classic:normal', JSON.stringify({
      played: 15, won: 12, currentStreak: 3, bestStreak: 5, totalGuesses: 40,
      firstTry: 1, firstTryStreak: 1, bestFirstTryStreak: 1,
      dist: [1, 2, 3, 2, 1, 3], totalScore: 0,
    }))

    const items = getAchievementShowcase()
    const byId = (id: string) => items.find((i) => i.ach.id === id)!

    expect(byId('first_blood').earned).toBe(true)
    expect(byId('apprentice').earned).toBe(true) // 12 >= 10
    expect(byId('streak5').earned).toBe(true) // bestStreak 5
    expect(byId('master').earned).toBe(false) // 12 < 50
    expect(byId('master').progress).toEqual({ current: 12, target: 50 })

    // Depoya da yazılmış olmalı — sayaç ve sonraki açılışlar tutarlı kalır
    const store = JSON.parse(localStorage.getItem('vt:ach')!) as Record<string, string>
    expect(store.first_blood).toBeTruthy()
    expect(store.apprentice).toBeTruthy()
    expect(store.master).toBeUndefined()
  })

  it('boş kayıtlarda hiçbir rozet kazanılmış sayılmaz', () => {
    const items = getAchievementShowcase()
    expect(items.length).toBe(ACHIEVEMENTS.length)
    expect(items.every((i) => !i.earned)).toBe(true)
  })
})

describe('buildSnapshot — Günlük sayımı (regresyon)', () => {
  /** Tek bir Günlük Klasik galibiyeti */
  function seedDailyWin() {
    localStorage.setItem('vt:stats:daily:classic', JSON.stringify({
      played: 1, won: 1, currentStreak: 1, bestStreak: 1, totalGuesses: 3,
      firstTry: 0, firstTryStreak: 0, bestFirstTryStreak: 0,
      dist: [0, 0, 1, 0, 0, 0], totalScore: 0,
    }))
  }

  // Günlük'te zorluk yok: statsKey diff'i yok sayar (`vt:stats:daily:{sub}`).
  // Zorluk döngüsü Günlük için de dönerse aynı kayıt 4 kez sayılır.
  it('Günlük kaydı yalnız BİR kez sayılır (4x şişme olmamalı)', () => {
    seedDailyWin()
    const s = buildSnapshot()
    expect(s.totalPlayed).toBe(1)
    expect(s.totalWon).toBe(1)
  })

  it('Günlük galibiyeti zorluk rozetlerini beslemez', () => {
    seedDailyWin()
    const s = buildSnapshot()
    // Günlük hep normal kurallarla oynanır — Aşırı Zor/Zor sayaçlarına girmemeli
    expect(s.hasInsaneWin).toBe(false)
    expect(s.insaneWins).toBe(0)
    expect(s.hardWins).toBe(0)
  })

  it('zorluk sayaçları gerçekten Aşırı Zor/Zor galibiyetlerinden beslenir', () => {
    localStorage.setItem('vt:stats:endless:classic:insane', JSON.stringify({
      played: 3, won: 2, currentStreak: 2, bestStreak: 2, totalGuesses: 8,
      firstTry: 0, firstTryStreak: 0, bestFirstTryStreak: 0,
      dist: [0, 0, 2, 0, 0, 0], totalScore: 0,
    }))
    const s = buildSnapshot()
    expect(s.hasInsaneWin).toBe(true)
    expect(s.insaneWins).toBe(2)
    expect(s.totalWon).toBe(2)
  })

  it('allSubsWon yalnız TÜM gerçek alt modlarda galibiyet varsa true (mix sayılmaz)', () => {
    const stat = (won: number) => JSON.stringify({
      played: won, won, currentStreak: 0, bestStreak: 0, totalGuesses: 0,
      firstTry: 0, firstTryStreak: 0, bestFirstTryStreak: 0,
      dist: [0, 0, 0, 0, 0, 0], totalScore: 0,
    })
    // Mod listesinden türet: yeni alt mod eklenince test kendiliğinden uyar
    const subs = SUB_MODES.map((m) => m.id)
    // Sonuncusu hariç hepsi + mix → yetmez (mix gerçek alt mod sayılmaz)
    for (const sub of [...subs.slice(0, -1), 'mix']) {
      localStorage.setItem(`vt:stats:endless:${sub}:normal`, stat(1))
    }
    expect(buildSnapshot().allSubsWon).toBe(false)

    localStorage.setItem(`vt:stats:endless:${subs.at(-1)}:normal`, stat(1)) // son gerçek mod
    expect(buildSnapshot().allSubsWon).toBe(true)
  })
})
