import { useMemo, useState } from 'react'
import { CHAMPIONS, PATCH } from '../game/data'
import { getDifficulty, RULES, setDifficulty as saveDifficulty } from '../game/difficulty'
import { getFilter, setFilter as saveFilter, type PoolFilter } from '../game/filter'
import { getBestScore, getDailyHistory, getDailyState, getDailyStreak, getStats, isStreakAlive, normalizeEntry } from '../game/stats'
import { DAILY_SUBS, DIFFICULTIES, MIX_MODE, SUB_MODES, TOP_MODES, type Difficulty, type PlaySub, type TopMode } from '../game/types'
import DailyPanel from './DailyPanel'
import DifficultyTable from './DifficultyTable'
import HowTo from './HowTo'
import Stats from './Stats'
import Achievements from './Achievements'
import PoolFilterPicker from './PoolFilterPicker'
import Leaderboard from './Leaderboard'
import CalendarModal from './CalendarModal'
import { useUpdateAvailable } from '../game/pwaUpdate'
import { sfxEnabled, setSfxEnabled } from '../game/sfx'
import { getChampWins, getEarnedAchievements, ACHIEVEMENTS } from '../game/achievements'
import { cryptoRandInt, todayKey } from '../game/rng'

interface Props {
  onPlay: (top: TopMode, sub: PlaySub, diff: Difficulty, filter: PoolFilter) => void
  onSettings: () => void
  /** Mini oyunlar ayrı ekran — alt mod yapısına oturmuyorlar */
  onMiniGame: (game: 'wordle' | 'bingo', daily: boolean) => void
}

const LOL_TIPS = [
  '💡 Jinx, Vi ve Ekko Zaun sokaklarında beraber büyümüştür.',
  '💡 Teemo’nun mantarları Vadide 5 dakika boyunca gizlenir.',
  '💡 Yasuo ve Yone rüzgâr tekniğinin son ustalarıdır.',
  '💡 Ahri, Dokuz Kuyruklu bir Vastaya büyücüsüdür.',
  '💡 Demacia şampiyonları büyüye karşı Petrisit taşından zırhlar kullanır.',
  '💡 Thresh, Kara Sis’in kalbindeki Ruh Toplayıcıdır.',
]

function getSummonerTitle(uniqueChamps: number): { title: string; icon: string; color: string } {
  if (uniqueChamps >= 100) return { title: 'Runeterra Efsanesi', icon: '👑', color: 'var(--gold-bright)' }
  if (uniqueChamps >= 50) return { title: 'Ionia Bilgesi', icon: '🔮', color: 'var(--accent-mystic)' }
  if (uniqueChamps >= 25) return { title: 'Demacia Muhafızı', icon: '🛡️', color: 'var(--accent-endless)' }
  if (uniqueChamps >= 10) return { title: 'Vadi Savaşçısı', icon: '⚔️', color: 'var(--accent-done)' }
  return { title: 'Sihirdar Çırağı', icon: '🌱', color: 'var(--text-dim)' }
}

export default function Menu({ onPlay, onSettings, onMiniGame }: Props) {
  const [top, setTop] = useState<TopMode | null>(null)
  const [howTo, setHowTo] = useState(false)
  const [stats, setStats] = useState(false)
  const [achievements, setAchievements] = useState(false)
  const [leaderboard, setLeaderboard] = useState(false)
  const [calendar, setCalendar] = useState(false)
  const [diffInfo, setDiffInfo] = useState(false)
  const [diff, setDiff] = useState<Difficulty>(getDifficulty)
  const [filter, setFilterState] = useState<PoolFilter>(getFilter)
  const [soundOn, setSoundOn] = useState(sfxEnabled)
  const updateReady = useUpdateAvailable()

  function pickDifficulty(d: Difficulty) {
    setDiff(d)
    saveDifficulty(d)
  }

  function pickFilter(f: PoolFilter) {
    setFilterState(f)
    saveFilter(f)
  }

  function toggleSound() {
    const next = !soundOn
    setSoundOn(next)
    setSfxEnabled(next)
  }

  // Rastgele LoL Vadi İpucu
  const randomTip = useMemo(() => LOL_TIPS[cryptoRandInt(LOL_TIPS.length)], [])

  // Kariyer ve Sihirdar Bilgileri
  const champWins = getChampWins()
  const uniqueChampCount = champWins.length
  const totalChamps = CHAMPIONS.length
  const summoner = getSummonerTitle(uniqueChampCount)

  const dailyStreak = getDailyStreak()
  const activeStreak = isStreakAlive(dailyStreak) ? dailyStreak.streak : 0
  const earnedAchCount = getEarnedAchievements().length
  const totalAchCount = ACHIEVEMENTS.length

  const todayData = getDailyHistory()[todayKey()] ?? {}
  const todayDoneCount = DAILY_SUBS.filter((m) => {
    const entry = normalizeEntry(todayData[m.id])
    return entry && entry.g > 0
  }).length

  const isDailyAllCompleted = todayDoneCount === DAILY_SUBS.length

  // Dinamik Hızlı Başla Aksiyonu
  function quickPlay() {
    if (!isDailyAllCompleted) {
      setTop('daily')
    } else {
      onPlay('endless', 'classic', diff, filter)
    }
  }

  return (
    <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center gap-3.5 sm:gap-5 px-3.5 sm:px-4 pb-8 pt-3 sm:pt-8">
      {/* Ambient Glow Lights */}
      <div className="pointer-events-none absolute -top-16 inset-x-0 flex justify-between opacity-30 blur-3xl" aria-hidden>
        <div className="h-48 w-48 rounded-full" style={{ background: 'var(--gold)' }} />
        <div className="h-48 w-48 rounded-full" style={{ background: 'var(--accent-endless)' }} />
      </div>

      {/* Üst Canlı Bar: Sihirdar Kimliği & Ses Kontrolü */}
      <div className="z-10 flex w-full items-center justify-between gap-2 text-xs">
        {/* Sol: Sihirdar Unvanı */}
        <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border px-2.5 sm:px-3 py-0.5 sm:py-1 font-bold shadow-sm backdrop-blur-md" style={{ background: 'rgba(255, 255, 255, 0.03)', borderColor: 'var(--border)' }}>
          <span>{summoner.icon}</span>
          <span style={{ color: summoner.color }}>{summoner.title}</span>
          <span className="opacity-40">•</span>
          <span style={{ color: 'var(--text-dim)' }}>🔥 {activeStreak} Gün</span>
        </div>

        {/* Sağ: Ses Aç/Kapat Butonu */}
        <button
          onClick={toggleSound}
          className="flex items-center gap-1.5 rounded-full border px-2.5 sm:px-3 py-0.5 sm:py-1 font-bold transition-all duration-200 hover:scale-105"
          style={{
            background: soundOn ? 'rgba(var(--accent-done-rgb), 0.1)' : 'rgba(255, 255, 255, 0.04)',
            borderColor: soundOn ? 'rgba(var(--accent-done-rgb), 0.3)' : 'var(--border)',
            color: soundOn ? 'var(--accent-done)' : 'var(--text-dim)',
          }}
          aria-label={soundOn ? 'Ses efektlerini kapat' : 'Ses efektlerini aç'}
          title={soundOn ? 'Ses Efektleri Açık' : 'Ses Efektleri Kapalı'}
        >
          <span>{soundOn ? '🔊' : '🔇'}</span>
          <span className="hidden sm:inline">{soundOn ? 'Ses Açık' : 'Sessiz'}</span>
        </button>
      </div>

      {/* Header & Logo */}
      <header className="anim-pop z-10 flex flex-col items-center text-center">
        <h1
          className="text-shimmer font-display text-3xl font-extrabold tracking-tight sm:text-5xl"
          style={{ filter: 'drop-shadow(0 0 18px rgba(var(--gold-glow-rgb), 0.35))' }}
        >
          Vadi Tahmini
        </h1>

        {/* Altın Hextech süsleme çizgisi */}
        <div className="mx-auto mt-1.5 sm:mt-2.5 flex items-center justify-center gap-2" aria-hidden>
          <span className="h-px w-10 sm:w-14" style={{ background: 'linear-gradient(90deg, transparent, var(--gold))' }} />
          <span style={{ color: 'var(--gold)' }}>◆</span>
          <span className="h-px w-10 sm:w-14" style={{ background: 'linear-gradient(90deg, var(--gold), transparent)' }} />
        </div>

        <p className="mt-1 sm:mt-2 text-xs sm:text-sm font-medium tracking-wide" style={{ color: 'var(--text-dim)' }}>
          ⚔️ League of Legends Tahmin Oyunu · Bil bakalım, şampiyon kim?
        </p>
      </header>

      {!top ? (
        <div className="stagger z-10 flex w-full flex-col gap-3 sm:gap-4">
          {/* Dinamik Hızlı Başla Hero Banner (State Logic Redundancy Solved) */}
          <button
            onClick={quickPlay}
            className="group relative flex w-full items-center justify-between overflow-hidden rounded-xl sm:rounded-2xl border px-3.5 sm:px-5 py-2.5 sm:py-3.5 shadow-lg transition-all duration-300 active:scale-[0.99]"
            style={{
              background: isDailyAllCompleted
                ? 'linear-gradient(135deg, rgba(var(--accent-done-deep-rgb), 0.15), rgba(var(--accent-endless-rgb), 0.08))'
                : 'linear-gradient(135deg, rgba(var(--gold-glow-rgb), 0.2), rgba(var(--gold-glow-deep-rgb), 0.1))',
              borderColor: isDailyAllCompleted ? 'var(--accent-done)' : 'var(--gold-bright)',
              boxShadow: isDailyAllCompleted
                ? '0 0 20px rgba(var(--accent-done-rgb), 0.18)'
                : '0 0 20px rgba(var(--gold-glow-rgb), 0.22)',
            }}
          >
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <span
                className="grid h-9 sm:h-10 w-9 sm:w-10 shrink-0 place-items-center rounded-xl text-xl sm:text-2xl shadow-md transition-transform duration-300 group-hover:scale-110"
                style={{
                  background: isDailyAllCompleted ? 'var(--accent-done-deep)' : 'var(--gold)',
                  color: 'var(--bg)',
                }}
              >
                {isDailyAllCompleted ? '🏆' : '⚡'}
              </span>
              <div className="text-left min-w-0">
                <span className="block text-xs sm:text-sm font-extrabold tracking-tight text-white truncate">
                  {isDailyAllCompleted ? '🏆 Günün Tüm Bulmacaları Tamamlandı!' : '🔥 Günün Bulmacasını Çöz'}
                </span>
                <span className="block text-[11px] font-medium text-amber-200/90 truncate">
                  {isDailyAllCompleted
                    ? 'Tebrikler! Şimdi Sınırsız Klasik Modda pratik yap →'
                    : `Bugün ${todayDoneCount}/${DAILY_SUBS.length} bitti — Kaldığın yerden devam et!`}
                </span>
              </div>
            </div>
            <span
              className="ml-2 shrink-0 rounded-lg sm:rounded-xl border px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold transition-transform duration-300 group-hover:translate-x-1"
              style={{
                background: isDailyAllCompleted ? 'var(--accent-done-deep)' : 'var(--gold)',
                borderColor: isDailyAllCompleted ? 'var(--accent-done)' : 'var(--gold-bright)',
                color: 'var(--bg)',
              }}
            >
              {isDailyAllCompleted ? 'Pratik Yap →' : 'Başla →'}
            </span>
          </button>

          {/* Ana Mod Seçim Kartları */}
          <div className="grid gap-2.5 sm:grid-cols-3">
            {/* Sınırsız */}
            <button
              onClick={() => setTop('endless')}
              className="group card-btn card-btn-lg relative flex flex-col items-start justify-between overflow-hidden rounded-xl sm:rounded-2xl border p-3.5 sm:p-4 text-left transition-all duration-300 hover:border-sky-400/60 hover:shadow-[0_0_24px_rgba(var(--accent-endless-rgb),0.2)]"
              style={{ background: 'linear-gradient(135deg, rgba(var(--accent-endless-rgb), 0.06), rgba(255, 255, 255, 0.01))', borderColor: 'var(--border)' }}
            >
              <div className="flex w-full items-center justify-between">
                <span className="grid h-10 sm:h-12 w-10 sm:w-12 place-items-center rounded-xl text-2xl sm:text-3xl shadow-inner transition-transform duration-300 group-hover:scale-110" style={{ background: 'rgba(var(--accent-endless-rgb), 0.12)', color: 'var(--accent-endless)' }}>
                  ♾️
                </span>
                <span className="text-xs font-bold opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ color: 'var(--accent-endless)' }}>
                  Oyna →
                </span>
              </div>
              <div className="mt-3 sm:mt-4">
                <span className="block text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-sky-300">
                  Sınırsız Mod
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                  Arka arkaya oyna, bekleme yok
                </span>
              </div>
            </button>

            {/* Günlük */}
            <button
              onClick={() => setTop('daily')}
              className="group card-btn card-btn-lg relative flex flex-col items-start justify-between overflow-hidden rounded-xl sm:rounded-2xl border p-3.5 sm:p-4 text-left transition-all duration-300 hover:border-amber-400 hover:shadow-[0_0_32px_rgba(var(--gold-glow-rgb),0.35)]"
              style={{
                background: 'linear-gradient(135deg, rgba(var(--gold-glow-rgb), 0.12), rgba(255, 255, 255, 0.02))',
                borderColor: isDailyAllCompleted ? 'var(--accent-done)' : 'rgba(var(--gold-glow-rgb), 0.4)',
              }}
            >
              <div className="flex w-full items-center justify-between">
                <span className="grid h-10 sm:h-12 w-10 sm:w-12 place-items-center rounded-xl text-2xl sm:text-3xl shadow-inner transition-transform duration-300 group-hover:scale-110" style={{ background: 'rgba(var(--gold-glow-rgb), 0.2)' }}>
                  📅
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shadow-sm"
                  style={{
                    background: isDailyAllCompleted ? 'rgba(var(--accent-done-rgb), 0.2)' : 'rgba(var(--gold-glow-rgb), 0.25)',
                    color: isDailyAllCompleted ? 'var(--accent-done)' : 'var(--gold-bright)',
                  }}
                >
                  {isDailyAllCompleted ? '✓ BİTTİ' : `${todayDoneCount}/${DAILY_SUBS.length}`}
                </span>
              </div>
              <div className="mt-3 sm:mt-4">
                <span className="block text-base sm:text-lg font-extrabold tracking-tight" style={{ color: 'var(--gold-bright)' }}>
                  Günlük Bulmaca
                </span>
                <span className="mt-0.5 block text-xs font-medium leading-relaxed" style={{ color: 'var(--text)' }}>
                  Herkese her gün aynı bulmaca
                </span>
              </div>
            </button>

            {/* Zamana Karşı */}
            <button
              onClick={() => setTop('timed')}
              className="group card-btn card-btn-lg relative flex flex-col items-start justify-between overflow-hidden rounded-xl sm:rounded-2xl border p-3.5 sm:p-4 text-left transition-all duration-300 hover:border-rose-400/70 hover:shadow-[0_0_24px_rgba(var(--accent-timed-rgb),0.2)]"
              style={{ background: 'linear-gradient(135deg, rgba(var(--accent-timed-rgb), 0.06), rgba(255, 255, 255, 0.01))', borderColor: 'var(--border)' }}
            >
              <div className="flex w-full items-center justify-between">
                <span className="grid h-10 sm:h-12 w-10 sm:w-12 place-items-center rounded-xl text-2xl sm:text-3xl shadow-inner transition-transform duration-300 group-hover:scale-110" style={{ background: 'rgba(var(--accent-timed-rgb), 0.12)', color: 'var(--accent-timed)' }}>
                  ⏱️
                </span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-300" style={{ background: 'rgba(var(--accent-timed-rgb), 0.18)' }}>
                  ⚡ Tempolu
                </span>
              </div>
              <div className="mt-3 sm:mt-4">
                <span className="block text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-rose-300">
                  Zamana Karşı
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                  Süre dolmadan Vadide kaç doğru?
                </span>
              </div>
            </button>
          </div>

          {/* Kariyer & Sihirdar İlerleme Barı */}
          <div className="flex items-center justify-around rounded-xl border py-2.5 sm:py-3 px-3 text-center text-xs shadow-sm backdrop-blur-md" style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'var(--border)' }}>
            <div>
              <span className="block font-extrabold text-sm" style={{ color: 'var(--gold-bright)' }}>💎 {uniqueChampCount}/{totalChamps}</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--text-dim)' }}>Keşif</span>
            </div>
            <div className="h-5 w-px" style={{ background: 'var(--border)' }} />
            <div>
              <span className="block font-extrabold text-sm" style={{ color: 'var(--gold)' }}>🏆 {earnedAchCount}/{totalAchCount}</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--text-dim)' }}>Başarım</span>
            </div>
            <div className="h-5 w-px" style={{ background: 'var(--border)' }} />
            <div>
              <span className="block font-extrabold text-sm text-sky-400">🎯 %{Math.round((earnedAchCount / totalAchCount) * 100)}</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--text-dim)' }}>Kariyer</span>
            </div>
          </div>

          {/* Mini Oyunlar */}
          <div>
            <div className="mb-1.5 sm:mb-2 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
                🕹️ Mini Oyunlar
              </span>
              <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(var(--gold-glow-rgb), 0.3), transparent)' }} />
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {[
                { id: 'wordle' as const, icon: '🔡', name: 'Kelime (Wordle)', desc: 'Şampiyon adını harf harf bul · 🟩 🟨 ⬛' },
                { id: 'bingo' as const, icon: '🎲', name: 'Bingo', desc: '90 saniyede 12 kutulu kartı doldur' },
              ].map((g) => (
                <div
                  key={g.id}
                  className="group overflow-hidden rounded-xl sm:rounded-2xl border transition-all duration-300 hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(var(--gold-glow-rgb),0.12)]"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center gap-3 p-3 sm:p-4 pb-2.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl sm:text-2xl shadow-inner transition-transform duration-300 group-hover:scale-110" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                      {g.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm sm:text-base font-bold tracking-tight" style={{ color: 'var(--gold-bright)' }}>
                        {g.name}
                      </span>
                      <span className="block text-xs" style={{ color: 'var(--text-dim)' }}>
                        {g.desc}
                      </span>
                    </span>
                  </div>

                  {/* Sınırsız / Günlük Buton Şeridi */}
                  <div className="flex border-t" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.15)' }}>
                    <button
                      onClick={() => onMiniGame(g.id, false)}
                      className="flex-1 py-2 text-xs font-bold tracking-wide transition-all hover:bg-amber-400/10 hover:text-amber-300"
                      style={{ color: 'var(--gold)' }}
                    >
                      ♾️ Sınırsız
                    </button>
                    <button
                      onClick={() => onMiniGame(g.id, true)}
                      className="flex-1 border-l py-2 text-xs font-bold tracking-wide transition-all hover:bg-amber-400/10 hover:text-amber-300"
                      style={{ borderColor: 'var(--border)', color: 'var(--gold)' }}
                    >
                      📅 Günlük
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sistem & Kariyer Butonları */}
          <div className="flex flex-col gap-2 w-full">
            {/* Üst Sıra: Sistem & Rehber */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              <button
                onClick={() => setHowTo(true)}
                className="card-btn flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl border py-2.5 sm:py-3 px-1.5 text-xs font-bold transition-all duration-200"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <span>❓</span>
                <span>Nasıl Oynanır</span>
              </button>
              <button
                onClick={() => setStats(true)}
                className="card-btn flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl border py-2.5 sm:py-3 px-1.5 text-xs font-bold transition-all duration-200"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <span>📊</span>
                <span>İstatistikler</span>
              </button>
              <button
                onClick={onSettings}
                className="card-btn relative flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl border py-2.5 sm:py-3 px-1.5 text-xs font-bold transition-all duration-200"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: updateReady ? 'var(--gold)' : 'var(--border)',
                  color: updateReady ? 'var(--gold-bright)' : 'var(--text)',
                }}
              >
                <span>⚙️</span>
                <span>Ayarlar</span>
                {updateReady && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5" aria-label="Yeni sürüm hazır" title="Yeni sürüm hazır">
                    <span className="anim-ping absolute inline-flex h-full w-full rounded-full" style={{ background: 'var(--gold)' }} />
                    <span className="relative inline-flex h-3.5 w-3.5 rounded-full border" style={{ background: 'var(--gold)', borderColor: 'var(--bg)' }} />
                  </span>
                )}
              </button>
            </div>

            {/* Alt Sıra: Kariyer & Rekabet */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              <button
                onClick={() => setAchievements(true)}
                className="card-btn flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl border py-2.5 sm:py-3 px-1.5 text-xs font-bold transition-all duration-200 hover:border-amber-400/50"
                style={{ background: 'linear-gradient(135deg, rgba(var(--gold-glow-rgb), 0.05), transparent)', borderColor: 'var(--border)', color: 'var(--gold-bright)' }}
              >
                <span>🏆</span>
                <span>Başarımlar</span>
              </button>
              <button
                onClick={() => setLeaderboard(true)}
                className="card-btn flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl border py-2.5 sm:py-3 px-1.5 text-xs font-bold transition-all duration-200 hover:border-amber-400/50"
                style={{ background: 'linear-gradient(135deg, rgba(var(--gold-glow-rgb), 0.05), transparent)', borderColor: 'var(--border)', color: 'var(--gold-bright)' }}
              >
                <span>🥇</span>
                <span>Sıralama</span>
              </button>
              <button
                onClick={() => setCalendar(true)}
                className="card-btn flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl border py-2.5 sm:py-3 px-1.5 text-xs font-bold transition-all duration-200 hover:border-amber-400/50"
                style={{ background: 'linear-gradient(135deg, rgba(var(--gold-glow-rgb), 0.05), transparent)', borderColor: 'var(--border)', color: 'var(--gold-bright)' }}
              >
                <span>📅</span>
                <span>Takvim</span>
              </button>
            </div>
          </div>

          {/* Vadi İpucu Banner'ı */}
          <div className="rounded-xl border p-2 sm:p-2.5 text-center text-xs italic opacity-90 shadow-sm backdrop-blur-md" style={{ background: 'rgba(var(--gold-glow-rgb), 0.03)', borderColor: 'rgba(var(--gold-glow-rgb), 0.15)', color: 'var(--text-dim)' }}>
            {randomTip}
          </div>
        </div>
      ) : (
        <div className="stagger z-10 flex w-full flex-col gap-4">
          {/* Başlık: geri + üst modun kimliği (ikon + ad + kısa açıklama), ortalı */}
          <div className="flex items-center gap-2">
            <button onClick={() => setTop(null)} className="card-btn flex w-[72px] shrink-0 justify-center rounded-xl border px-3 py-1.5 text-sm font-semibold transition-all hover:scale-105"
              style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
              ← Geri
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2.5">
              <span className="text-2xl">{TOP_MODES.find((m) => m.id === top)!.icon}</span>
              <div className="min-w-0 text-center">
                <div className="font-display text-lg font-bold leading-tight" style={{ color: 'var(--gold-bright)' }}>
                  {TOP_MODES.find((m) => m.id === top)!.name}
                </div>
                <div className="truncate text-xs" style={{ color: 'var(--text-dim)' }}>
                  {TOP_MODES.find((m) => m.id === top)!.desc}
                </div>
              </div>
            </div>
            {/* Başlık ortada kalsın diye geri butonuyla eş genişlik boşluk */}
            <span className="w-[72px] shrink-0" aria-hidden />
          </div>

          {top === 'daily' && <DailyPanel />}

          {/* Zorluk — kendi kartında, "Zorluk" etiketi + sağda karşılaştırma anahtarı */}
          {top !== 'daily' && (
            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>Zorluk</span>
                <button onClick={() => setDiffInfo((v) => !v)}
                  className="text-xs underline underline-offset-2" style={{ color: 'var(--gold)' }}>
                  {diffInfo ? 'gizle' : 'Seviyeler ne değiştiriyor?'}
                </button>
              </div>
              <div className="flex w-full overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                {DIFFICULTIES.map((d) => (
                  <button key={d.id} onClick={() => pickDifficulty(d.id)}
                    className="flex-1 px-1 py-2 text-xs font-bold transition-all sm:text-sm"
                    style={{
                      background: diff === d.id ? 'var(--gold)' : 'transparent',
                      color: diff === d.id ? 'var(--on-gold)' : 'var(--text-dim)',
                      boxShadow: diff === d.id ? 'inset 0 -2px 0 var(--gold-bright)' : 'none',
                    }}>
                    {d.name}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
                {top === 'timed'
                  ? `İpuçları ve süre değişir (${RULES[diff].timedSeconds} sn) · skorlar seviye başına ayrı`
                  : 'İpuçlarının ne zaman açıldığını belirler · istatistikler seviye başına ayrı'}
              </p>
              {diffInfo && (
                <div className="anim-pop mt-2 rounded-lg border p-3"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}>
                  <DifficultyTable />
                </div>
              )}
            </div>
          )}

          {/* Havuz filtresi — Günlük'te yok (herkes aynı bulmacayı çözmeli) */}
          {top !== 'daily' && <PoolFilterPicker value={filter} onChange={pickFilter} />}

          {/* Mod seçimi bölgesi */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
                Ne tahmin edeceksin?
              </span>
              <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, var(--border), transparent)' }} />
            </div>

            {/* Alt modlar — geniş ekranda ikişerli */}
            <div className="grid gap-2.5 sm:grid-cols-2">
              {(top === 'daily' ? DAILY_SUBS : SUB_MODES).map((m) => {
                const dailyDone = top === 'daily' && getDailyState(m.id).done
                const stats = getStats(top, m.id, diff)
                const info =
                  top === 'timed'
                    ? `En iyi: ${getBestScore(m.id, diff)}`
                    : top === 'daily' && dailyDone
                      ? '✓ Bitti'
                      : stats.played > 0
                        ? `Seri: ${stats.currentStreak}`
                        : ''
                return (
                  <button key={m.id} onClick={() => onPlay(top, m.id, diff, filter)}
                    className="card-btn flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:scale-[1.01]"
                    style={{
                      background: 'var(--bg-card)',
                      borderColor: dailyDone ? 'var(--correct)' : 'var(--border)',
                    }}>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-2xl"
                      style={{ background: 'var(--bg-input)' }}>{m.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold" style={{ color: 'var(--gold-bright)' }}>{m.name}</span>
                      <span className="block text-xs" style={{ color: 'var(--text-dim)' }}>{m.desc}</span>
                    </span>
                    {info && (
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          background: dailyDone ? 'var(--gold-soft)' : 'var(--bg-input)',
                          color: dailyDone ? 'var(--correct)' : 'var(--text-dim)',
                        }}>
                        {info}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Karışık — Günlük'te yok. Tam genişlik, altın çerçeveyle öne çıkar */}
            {top !== 'daily' && (() => {
              const mixStats = getStats(top, 'mix', diff)
              const info = top === 'timed'
                ? `En iyi: ${getBestScore('mix', diff)}`
                : mixStats.played > 0 ? `Seri: ${mixStats.currentStreak}` : ''
              return (
                <button onClick={() => onPlay(top, 'mix', diff, filter)}
                  className="card-btn mt-2.5 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all hover:scale-[1.01]"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--gold)' }}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-2xl"
                    style={{ background: 'var(--gold-soft)' }}>{MIX_MODE.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold" style={{ color: 'var(--gold-bright)' }}>{MIX_MODE.name}</span>
                    <span className="block text-xs" style={{ color: 'var(--text-dim)' }}>
                      {top === 'timed' ? 'Her soru başka tipten (Klasik hariç)' : 'Her soru başka tipten gelsin'}
                    </span>
                  </span>
                  {info && (
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ background: 'var(--bg-input)', color: 'var(--text-dim)' }}>
                      {info}
                    </span>
                  )}
                </button>
              )
            })()}
          </div>
        </div>
      )}

      <footer className="mt-3 sm:mt-4 text-center text-xs opacity-75" style={{ color: 'var(--text-dim)' }}>
        Patch {PATCH} · Riot Games ile ilişkili değildir
      </footer>

      {howTo && <HowTo onClose={() => setHowTo(false)} />}
      {stats && <Stats initialDifficulty={diff} onClose={() => setStats(false)} />}
      {achievements && <Achievements onClose={() => setAchievements(false)} />}
      {leaderboard && <Leaderboard onClose={() => setLeaderboard(false)} />}
      {calendar && <CalendarModal onClose={() => setCalendar(false)} />}
    </div>
  )
}
