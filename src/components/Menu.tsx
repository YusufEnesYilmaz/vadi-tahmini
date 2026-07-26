import { useMemo, useState, type CSSProperties } from 'react'
import { CHAMPIONS, PATCH, loadingUrl } from '../game/data'
import { getDifficulty, RULES, setDifficulty as saveDifficulty } from '../game/difficulty'
import { getFilter, setFilter as saveFilter, type PoolFilter } from '../game/filter'
import { getBestScore, getDailyHistory, getDailyState, getDailyStreak, getStats, isStreakAlive, normalizeEntry } from '../game/stats'
import { DAILY_SUBS, DIFFICULTIES, MIX_MODE, SUB_MODES, TOP_MODES, type Difficulty, type PlaySub, type TopMode } from '../game/types'
import DailyPanel from './DailyPanel'
import DifficultyTable from './DifficultyTable'
import PoolFilterPicker from './PoolFilterPicker'
import RankModal from './RankModal'
import Changelog from './Changelog'
import { hasUnseenChangelog } from '../game/changelog'
import { titleFor } from '../game/rank'
import { useUpdateAvailable } from '../game/pwaUpdate'
import { sfxEnabled, setSfxEnabled } from '../game/sfx'
import { getChampWins, getEarnedAchievements, ACHIEVEMENTS } from '../game/achievements'
import { cryptoRandInt, todayKey } from '../game/rng'
import { miniDailyDone } from '../game/miniDaily'
import RankEmblem from './RankEmblem'
import PlayerGuide from './PlayerGuide'
import Onboarding from './Onboarding'
import { needsOnboarding } from '../game/onboarding'

interface Props {
  onPlay: (top: TopMode, sub: PlaySub, diff: Difficulty, filter: PoolFilter) => void
  onSettings: () => void
  onChampions: () => void
  onItems: () => void
  onHowTo: () => void
  /** Mini oyunlar ayrı ekran — alt mod yapısına oturmuyorlar */
  onMiniGame: (game: 'wordle' | 'bingo' | 'timeline' | 'hunt' | 'grid' | 'connections', daily: boolean) => void
  /** "Kaç Tane?" — tek kişilik Sınırsız */
  onCounter: () => void
  /** "Kaç Tane?" — gerçek zamanlı oda (multiplayer) */
  onCounterMulti: () => void
}

const LOL_TIPS = [
  '💡 Jinx, Vi ve Ekko Zaun sokaklarında beraber büyümüştür.',
  '💡 Teemo’nun mantarları Vadide 5 dakika boyunca gizlenir.',
  '💡 Yasuo ve Yone rüzgâr tekniğinin son ustalarıdır.',
  '💡 Ahri, Dokuz Kuyruklu bir Vastaya büyücüsüdür.',
  '💡 Demacia şampiyonları büyüye karşı Petrisit taşından zırhlar kullanır.',
  '💡 Thresh, Kara Sis’in kalbindeki Ruh Toplayıcıdır.',
]

/**
 * Hero kadrosu — GERÇEK ddragon sanatı (üretilmiş şampiyon sahte durur).
 * Sıra ekrandaki dizilim: solda Garen + Seraphine, ORTADA Arcane kadrosu
 * (başlığın arkasına denk geldiği için maskeyle sönümlenir), sağda Teemo.
 * `focus` = `object-position` dikey hizası; her art'ta yüz farklı yükseklikte.
 */
const HERO_CAST: { id: string; focus: string }[] = [
  { id: 'Garen', focus: '16%' },
  { id: 'Seraphine', focus: '18%' },
  { id: 'Jinx', focus: '18%' },
  { id: 'Vi', focus: '16%' },
  { id: 'Ekko', focus: '18%' },
  { id: 'MasterYi', focus: '16%' },
  { id: 'Teemo', focus: '30%' },
]

type ModeCardId = 'endless' | 'daily' | 'timed'

const MODE_CARD_ART: Record<ModeCardId, { src: string; artClassName: string; overlayClassName: string }> = {
  endless: {
    src: '/card-endless.png',
    artClassName: 'menu-mode-card-art-endless',
    overlayClassName: 'menu-mode-card-darken-endless',
  },
  daily: {
    src: '/card-daily.png',
    artClassName: 'menu-mode-card-art-daily',
    overlayClassName: 'menu-mode-card-darken-daily',
  },
  timed: {
    src: '/card-timed.png',
    artClassName: 'menu-mode-card-art-timed',
    overlayClassName: 'menu-mode-card-darken-timed',
  },
}

function ModeCardBackdrop({ failed, mode, onError }: { failed: boolean; mode: ModeCardId; onError: (mode: ModeCardId) => void }) {
  if (failed) return null

  const art = MODE_CARD_ART[mode]

  return (
    <>
      <img
        src={art.src}
        alt=""
        aria-hidden="true"
        className={`menu-mode-card-art ${art.artClassName}`}
        decoding="async"
        draggable={false}
        onError={() => onError(mode)}
      />
      <span aria-hidden="true" className={`menu-mode-card-darken ${art.overlayClassName}`} />
    </>
  )
}

export default function Menu({ onPlay, onSettings, onChampions, onItems, onHowTo, onMiniGame, onCounter, onCounterMulti }: Props) {
  const [top, setTop] = useState<TopMode | null>(null)
  const [rank, setRank] = useState(false)
  const [changelog, setChangelog] = useState(false)
  // Kapanınca yeniden hesaplansın diye state — modal "görüldü" yazar, bant söner
  const [unseenNews, setUnseenNews] = useState(hasUnseenChangelog)
  const [diffInfo, setDiffInfo] = useState(false)
  const [diff, setDiff] = useState<Difficulty>(getDifficulty)
  const [filter, setFilterState] = useState<PoolFilter>(getFilter)
  const [soundOn, setSoundOn] = useState(sfxEnabled)
  const [playerGuideOpen, setPlayerGuideOpen] = useState(false)
  // İlk girişe özel öğretici — bayrak yazıldıktan sonra bir daha çıkmaz.
  // Menüde tutuluyor çünkü açılışta ekran ZATEN menü (App.initialScreen).
  const [onboarding, setOnboarding] = useState(needsOnboarding)
  const [modeCardArtFailed, setModeCardArtFailed] = useState<Record<ModeCardId, boolean>>({
    endless: false,
    daily: false,
    timed: false,
  })
  const updateReady = useUpdateAvailable()
  const topMode = top ? TOP_MODES.find((m) => m.id === top)! : null

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

  function handleModeCardArtError(mode: ModeCardId) {
    setModeCardArtFailed((current) => (current[mode] ? current : { ...current, [mode]: true }))
  }

  // Rastgele LoL Vadi İpucu
  const randomTip = useMemo(() => LOL_TIPS[cryptoRandInt(LOL_TIPS.length)], [])

  // Kariyer ve Sihirdar Bilgileri
  const champWins = getChampWins()
  const uniqueChampCount = champWins.length
  const totalChamps = CHAMPIONS.length

  const dailyStreak = getDailyStreak()
  const activeStreak = isStreakAlive(dailyStreak) ? dailyStreak.streak : 0
  // Unvan EN İYİ günlük seriye göre (kırılsa da düşmez, kullanıcı kararı).
  // 🔥 rozetinde görünen `activeStreak` ise GÜNCEL seri — ikisi ayrı.
  const summoner = titleFor(dailyStreak.best)
  const earnedAchCount = getEarnedAchievements().length
  const totalAchCount = ACHIEVEMENTS.length

  const today = todayKey()
  const todayData = getDailyHistory()[today] ?? {}
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
    // Masaüstünde geniş sahne (5xl) — ana menü iki kolona açılır; mobil tek kolon aynı
    <>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="menu-scene-bg absolute inset-0" />
        <div className="menu-scene-overlay absolute inset-0" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-2xl lg:max-w-5xl flex-col items-center gap-3.5 px-3.5 pb-8 pt-3 sm:gap-5 sm:px-4 sm:pt-8">
      {/* Ambient Glow Lights */}
      <div className="pointer-events-none absolute -top-16 inset-x-0 flex justify-between opacity-30 blur-3xl" aria-hidden>
        <div className="h-48 w-48 rounded-full" style={{ background: 'var(--gold)' }} />
        <div className="h-48 w-48 rounded-full" style={{ background: 'var(--accent-endless)' }} />
      </div>

      {/* Üst Canlı Bar: Sihirdar Kimliği & Ses Kontrolü */}
      <div className="menu-hero anim-pop z-10 w-full overflow-hidden rounded-[24px] border px-3.5 py-3 sm:rounded-[30px] sm:px-5 sm:py-4">
        {/* Hero kadrosu — GERÇEK ddragon sanatı (üretilmiş değil; üretilmiş şampiyon sahte durur).
            İçeriğin ARKASINDA (z-0): kenarlardan içeri maskeyle erir, orta bölge başlık için temiz kalır.
            Her karakterin kadrajı ayrı (`objectPosition`) — yüz hizası art'a göre değişiyor. */}
        <span className="menu-hero-cast" aria-hidden>
          {HERO_CAST.map((c) => (
            <img
              key={c.id}
              src={loadingUrl(c.id, 0)}
              alt=""
              decoding="async"
              style={{ objectPosition: `center ${c.focus}` }}
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          ))}
        </span>
        <div className="flex flex-col gap-5 sm:gap-8">
          <div className="flex w-full items-center justify-between gap-2 text-xs">
        {/* Sol: Sihirdar Unvanı — tıklanınca kademelerin listesi açılır */}
            <button
          onClick={() => setRank(true)}
          className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-bold shadow-sm backdrop-blur-md transition-all hover:scale-105 sm:gap-2 sm:px-3 sm:py-1"
          style={{ background: 'rgba(var(--bg-card-rgb), 0.68)', borderColor: 'rgba(var(--gold-rgb), 0.2)' }}
          aria-label="Sihirdar unvanları ve kademeleri gör"
          title="Unvanların nasıl yükseldiğini gör"
        >
          <RankEmblem tier={summoner} size={26} />
          <span style={{ color: summoner.color }}>{summoner.title}</span>
          <span className="opacity-40">•</span>
          <span style={{ color: 'var(--text-dim)' }}>🔥 {activeStreak} Gün</span>
            </button>

        {/* Sağ: Ses Aç/Kapat Butonu */}
            <button
          onClick={toggleSound}
          className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-bold transition-all duration-200 hover:scale-105 sm:px-3 sm:py-1"
          style={{
            background: soundOn ? 'rgba(var(--accent-done-rgb), 0.14)' : 'rgba(var(--bg-card-rgb), 0.72)',
            borderColor: soundOn ? 'rgba(var(--accent-done-rgb), 0.36)' : 'rgba(var(--gold-rgb), 0.18)',
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
          <header className="flex min-h-[132px] flex-col items-center justify-center pb-1 text-center sm:min-h-[168px] sm:pb-2">
        <h1
          className="text-shimmer font-display text-3xl font-extrabold tracking-tight sm:text-5xl"
          style={{ filter: 'drop-shadow(0 0 18px rgba(var(--gold-glow-rgb), 0.35))' }}
        >
          Vadi Tahmini
        </h1>

        {/* Altın Hextech süsleme çizgisi */}
            <div className="mx-auto mt-1.5 flex items-center justify-center gap-2 sm:mt-2.5" aria-hidden>
          <span className="h-px w-10 sm:w-14" style={{ background: 'linear-gradient(90deg, transparent, var(--gold))' }} />
          <span style={{ color: 'var(--gold)' }}>◆</span>
          <span className="h-px w-10 sm:w-14" style={{ background: 'linear-gradient(90deg, var(--gold), transparent)' }} />
        </div>

            <p className="mt-1 text-xs font-medium tracking-wide sm:mt-2 sm:text-sm" style={{ color: 'var(--gold-bright)' }}>
          ⚔️ League of Legends Tahmin Oyunu · Bil bakalım, şampiyon kim?
            </p>
          </header>
        </div>
      </div>

      {!top ? (
        <div className="stagger z-10 flex w-full flex-col gap-3 sm:gap-4 lg:grid lg:grid-cols-[1.35fr_1fr] lg:items-start lg:gap-5">
          {/* SOL kolon (masaüstü): hero + ana modlar + ilerleme şeridi. Mobilde sıra değişmez. */}
          <div className="flex flex-col gap-3 sm:gap-4">
          {/* 🆕 Yenilikler bandı — YALNIZ görülmemiş changelog girdisi varken; okuyunca söner */}
          {unseenNews && (
            <button
              onClick={() => setChangelog(true)}
              className="anim-pop flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all hover:scale-[1.01]"
              style={{
                background: 'linear-gradient(90deg, rgba(var(--gold-glow-rgb), 0.14), rgba(var(--gold-glow-rgb), 0.05))',
                borderColor: 'rgba(var(--gold-glow-rgb), 0.4)',
                color: 'var(--gold-bright)',
              }}
            >
              🆕 Yeni sürümde neler var? <span aria-hidden>→</span>
            </button>
          )}
          {/* Dinamik Hızlı Başla Hero Banner (State Logic Redundancy Solved) */}
          <button
            onClick={quickPlay}
            className={`group hextech-card menu-quickplay ${isDailyAllCompleted ? 'menu-quickplay-complete' : 'menu-quickplay-active'} relative flex w-full items-center justify-between overflow-hidden rounded-xl border px-3.5 py-2.5 shadow-lg transition-all duration-300 active:scale-[0.99] sm:rounded-2xl sm:px-5 sm:py-3.5`}
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
                {/* Metin duruma göre: hiç başlamadıysa DAVET, yarım kaldıysa DEVAM.
                    (Eskiden 0/7'de bile "kaldığın yerden devam et" diyordu.)
                    Başlıkta emoji YOK — soldaki ikon rozeti zaten onu gösteriyor. */}
                <span className="block text-xs sm:text-sm font-extrabold tracking-tight text-white truncate">
                  {isDailyAllCompleted
                    ? 'Günün Tüm Bulmacaları Tamamlandı!'
                    : todayDoneCount === 0
                      ? 'Günün Bulmacasını Çöz'
                      : 'Günlüğe Devam Et'}
                </span>
                <span className="block text-[11px] font-medium text-amber-200/90 truncate">
                  {isDailyAllCompleted
                    ? 'Tebrikler! Şimdi Sınırsız Klasik\'te pratik yap →'
                    : todayDoneCount === 0
                      ? `Bugün için ${DAILY_SUBS.length} bulmaca hazır`
                      : `Bugün ${todayDoneCount}/${DAILY_SUBS.length} bitti — kaldığın yerden devam et`}
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
              className="group card-btn card-btn-lg hextech-card menu-mode-card menu-mode-card-endless relative flex flex-col items-start justify-between overflow-hidden rounded-xl border p-3.5 text-left transition-all duration-300 hover:border-sky-400/60 hover:shadow-[0_0_24px_rgba(var(--accent-endless-rgb),0.2)] sm:rounded-2xl sm:p-4"
              style={{ background: 'linear-gradient(135deg, rgba(var(--accent-endless-rgb), 0.06), rgba(255, 255, 255, 0.01))', borderColor: 'var(--border)' }}
            >
              <ModeCardBackdrop failed={modeCardArtFailed.endless} mode="endless" onError={handleModeCardArtError} />
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
              className="group card-btn card-btn-lg hextech-card menu-mode-card menu-mode-card-daily relative flex flex-col items-start justify-between overflow-hidden rounded-xl border p-3.5 text-left transition-all duration-300 hover:border-amber-400 hover:shadow-[0_0_32px_rgba(var(--gold-glow-rgb),0.35)] sm:rounded-2xl sm:p-4"
              style={{
                background: 'linear-gradient(135deg, rgba(var(--gold-glow-rgb), 0.12), rgba(255, 255, 255, 0.02))',
                borderColor: isDailyAllCompleted ? 'var(--accent-done)' : 'rgba(var(--gold-glow-rgb), 0.4)',
              }}
            >
              <ModeCardBackdrop failed={modeCardArtFailed.daily} mode="daily" onError={handleModeCardArtError} />
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
              className="group card-btn card-btn-lg hextech-card menu-mode-card menu-mode-card-timed relative flex flex-col items-start justify-between overflow-hidden rounded-xl border p-3.5 text-left transition-all duration-300 hover:border-rose-400/70 hover:shadow-[0_0_24px_rgba(var(--accent-timed-rgb),0.2)] sm:rounded-2xl sm:p-4"
              style={{ background: 'linear-gradient(135deg, rgba(var(--accent-timed-rgb), 0.06), rgba(255, 255, 255, 0.01))', borderColor: 'var(--border)' }}
            >
              <ModeCardBackdrop failed={modeCardArtFailed.timed} mode="timed" onError={handleModeCardArtError} />
              <div className="flex w-full items-center justify-between">
                <span className="grid h-10 sm:h-12 w-10 sm:w-12 place-items-center rounded-xl text-2xl sm:text-3xl shadow-inner transition-transform duration-300 group-hover:scale-110" style={{ background: 'rgba(var(--accent-timed-rgb), 0.12)', color: 'var(--accent-timed)' }}>
                  ⏱️
                </span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-300" style={{ background: 'rgba(var(--accent-timed-rgb), 0.18)' }}>
                  Tempolu
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
          <div className="menu-stat-strip hextech-frame flex items-center justify-around rounded-xl border px-3 py-2.5 text-center text-xs backdrop-blur-md sm:py-3" style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}>
            <div>
              <span className="block font-extrabold text-sm" style={{ color: 'var(--gold-bright)', textShadow: '0 0 12px rgba(var(--gold-glow-rgb), 0.35)' }}>💎 {uniqueChampCount}/{totalChamps}</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--text-dim)' }}>Keşif</span>
            </div>
            <div className="h-6 w-px" style={{ background: 'linear-gradient(var(--border), transparent)' }} />
            <div>
              <span className="block font-extrabold text-sm" style={{ color: 'var(--gold)', textShadow: '0 0 12px rgba(var(--gold-glow-rgb), 0.3)' }}>🏆 {earnedAchCount}/{totalAchCount}</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--text-dim)' }}>Başarım</span>
            </div>
            <div className="h-6 w-px" style={{ background: 'linear-gradient(var(--border), transparent)' }} />
            <div>
              <span className="block font-extrabold text-sm text-sky-400" style={{ textShadow: '0 0 12px rgba(var(--accent-endless-rgb), 0.35)' }}>🎯 %{Math.round((earnedAchCount / totalAchCount) * 100)}</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--text-dim)' }}>Kariyer</span>
            </div>
          </div>

          {/* Sistem butonları */}
          <div className="flex flex-col gap-2 w-full">
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              <button
                onClick={() => setPlayerGuideOpen(true)}
                className="menu-system-btn group card-btn flex items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-xs font-bold transition-all duration-200 sm:gap-2.5 sm:py-3"
                style={{ borderColor: 'var(--border)', color: 'var(--gold-bright)', '--sys-accent-rgb': 'var(--hextech-rgb)' } as CSSProperties}
              >
                <span className="menu-system-badge grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                    <path d="M12 6.6C10.4 5.2 7.6 4.7 4.7 5.4v12c2.9-.7 5.7-.2 7.3 1.2 1.6-1.4 4.4-1.9 7.3-1.2v-12C16.4 4.7 13.6 5.2 12 6.6Z" />
                    <path d="M12 6.6v12.2" />
                  </svg>
                </span>
                  <span>Oyuncu Rehberi</span>
              </button>
              <button
                onClick={onSettings}
                className="menu-system-btn group card-btn relative flex items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-xs font-bold transition-all duration-200 sm:gap-2.5 sm:py-3"
                style={{
                  borderColor: updateReady ? 'var(--gold)' : 'var(--border)',
                  color: 'var(--gold-bright)',
                  '--sys-accent-rgb': 'var(--gold-rgb)',
                } as CSSProperties}
              >
                <span className="menu-system-badge grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                    <circle cx="12" cy="12" r="3.1" />
                    <path d="M12 3.4v2.4M12 18.2v2.4M20.6 12h-2.4M5.8 12H3.4M18.08 5.92l-1.7 1.7M7.62 16.38l-1.7 1.7M18.08 18.08l-1.7-1.7M7.62 7.62l-1.7-1.7" />
                  </svg>
                </span>
                <span>Ayarlar</span>
                {updateReady && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5" aria-label="Yeni sürüm hazır" title="Yeni sürüm hazır">
                    <span className="anim-ping absolute inline-flex h-full w-full rounded-full" style={{ background: 'var(--gold)' }} />
                    <span className="relative inline-flex h-3.5 w-3.5 rounded-full border" style={{ background: 'var(--gold)', borderColor: 'var(--bg)' }} />
                  </span>
                )}
              </button>
            </div>
          </div>
          </div>

          {/* SAĞ kolon (masaüstü): mini oyunlar (sistem butonları 2026-07-24'te SOL kolona taşındı) */}
          <div className="flex flex-col gap-3 sm:gap-4">
          {/* Mini Oyunlar */}
          <div>
            <div className="section-label hextech-divider mb-1.5 sm:mb-2" style={{ color: 'var(--gold)' }}>
              <span>
                🕹️ Mini Oyunlar
              </span>
            </div>

            {/*
              KOMPAKT SATIR düzeni (2026-07-24): mini oyunlar 2→7'ye çıkınca büyük dikey
              kartlar sağ kolonu upuzun yapıyordu (sol altta boşluk). Satır = ikon + ad +
              tek satır truncate açıklama (tam metin title'da) + sağda küçük buton çifti.
            */}
            <div className="menu-mini-shell rounded-2xl border p-2.5 sm:p-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'wordle' as const, icon: '🔡', name: 'Kelime (Wordle)', desc: 'Şampiyon adını harf harf bul · 🟩 🟨 ⬛' },
                  { id: 'bingo' as const, icon: '🎲', name: 'Bingo', desc: '90 saniyede 12 kutulu kartı doldur' },
                  { id: 'timeline' as const, icon: '🕰️', name: 'Zaman Tüneli', desc: '5 şampiyonu çıkış yılına göre sırala' },
                  { id: 'hunt' as const, icon: '🏹', name: 'Şampiyon Avı', desc: 'Alfabetik mesafe ipucuyla 8 denemede bul' },
                  { id: 'grid' as const, icon: '🔲', name: 'Dokuz Kare', desc: '3×3: iki kriteri sağlayan 9 farklı şampiyon' },
                  { id: 'connections' as const, icon: '🧩', name: 'Bağlantılar', desc: '16 şampiyonu 4\'lü gizli gruplara ayır' },
                ].map((g) => {
                  const dailyDone = miniDailyDone(g.id)
                  return (
                    <div
                      key={g.id}
                      className="menu-mini-entry group hextech-frame flex items-center gap-2.5 rounded-xl border p-2 pl-2.5 transition-all duration-300 hover:border-amber-500/50 hover:shadow-[0_0_16px_rgba(var(--gold-glow-rgb),0.10)]"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg shadow-inner transition-transform duration-300 group-hover:scale-110" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                        {g.icon}
                      </span>
                      <span className="min-w-0 flex-1" title={g.desc}>
                        <span className="block truncate text-sm font-bold tracking-tight" style={{ color: 'var(--gold-bright)' }}>
                          {g.name}
                        </span>
                        <span className="block truncate text-[11px]" style={{ color: 'var(--text-dim)' }}>
                          {g.desc}
                        </span>
                      </span>
                      <span className="menu-mini-actions flex shrink-0 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                        <button
                          onClick={() => onMiniGame(g.id, false)}
                          aria-label={`${g.name} sınırsız`}
                          className="menu-seg min-w-[80px] rounded-l-lg px-2.5 py-1.5 text-center text-[11px] font-bold whitespace-nowrap"
                          style={{ color: 'var(--gold)' }}
                        >
                          ♾️ Sınırsız
                        </button>
                        <button
                          onClick={() => onMiniGame(g.id, true)}
                          aria-label={dailyDone ? `${g.name} günlük — bugün tamamlandı, sonucu gör` : `${g.name} günlük`}
                          className={`menu-seg min-w-[80px] rounded-r-lg border-l px-2.5 py-1.5 text-center text-[11px] font-bold whitespace-nowrap${dailyDone ? ' menu-seg-done' : ''}`}
                          style={{
                            borderColor: 'var(--border)',
                            color: dailyDone ? 'var(--accent-done)' : 'var(--gold)',
                          }}
                        >
                          {dailyDone ? '✓ Bitti' : '📅 Günlük'}
                        </button>
                      </span>
                    </div>
                  )
                })}

                {/* Kaç Tane? — süreli sayım modu (Sınırsız + Multi), aynı satır kalıbı */}
                <div className="menu-mini-entry group hextech-frame flex items-center gap-2.5 rounded-xl border p-2 pl-2.5 transition-all duration-300 hover:border-amber-500/50 hover:shadow-[0_0_16px_rgba(var(--gold-glow-rgb),0.10)]"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg shadow-inner transition-transform duration-300 group-hover:scale-110" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                    🔢
                  </span>
                  <span className="min-w-0 flex-1" title="Ölçüte uyan şampiyonları say · süre dolmadan kaç tane?">
                    <span className="block truncate text-sm font-bold tracking-tight" style={{ color: 'var(--gold-bright)' }}>
                      Kaç Tane?
                    </span>
                    <span className="block truncate text-[11px]" style={{ color: 'var(--text-dim)' }}>
                      Ölçüte uyanları say · tek başına ya da odada
                    </span>
                  </span>
                  <span className="menu-mini-actions flex shrink-0 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                    <button onClick={onCounter} aria-label="Kaç Tane? sınırsız"
                      className="menu-seg min-w-[80px] rounded-l-lg px-2.5 py-1.5 text-center text-[11px] font-bold whitespace-nowrap"
                      style={{ color: 'var(--gold)' }}>
                      ♾️ Sınırsız
                    </button>
                    <button onClick={onCounterMulti} aria-label="Kaç Tane? multiplayer — oda kur ya da koda katıl"
                      className="menu-seg min-w-[80px] rounded-r-lg border-l px-2.5 py-1.5 text-center text-[11px] font-bold whitespace-nowrap"
                      style={{ borderColor: 'var(--border)', color: 'var(--gold)' }}>
                      👥 Multi
                    </button>
                  </span>
                </div>
              </div>
            </div>
          </div>

          </div>

          {/* Vadi İpucu Banner'ı — masaüstünde iki kolonun altında tam genişlik */}
          <div className="menu-tip-banner lg:col-span-2 rounded-xl border p-2 text-center text-xs italic opacity-90 shadow-sm backdrop-blur-md sm:p-2.5" style={{ background: 'rgba(var(--gold-glow-rgb), 0.03)', borderColor: 'rgba(var(--gold-glow-rgb), 0.15)', color: 'var(--text-dim)' }}>
            {randomTip}
          </div>
        </div>
      ) : (
        // Alt mod seçimi odaklı bir akış — 5xl sahnede bile 3xl'de toplu kalır
        <div className="stagger z-10 flex w-full lg:max-w-4xl flex-col gap-4">
          {/* Başlık: geri + üst modun kimliği (ikon + ad + kısa açıklama), ortalı */}
          <div className={`menu-subflow-header menu-subpanel menu-subflow-header-${top} rounded-[22px] border px-3.5 py-3 sm:px-4 sm:py-3.5`}>
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
              <button
                onClick={() => setTop(null)}
                className="menu-subflow-back card-btn flex shrink-0 items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition-all hover:scale-105"
                style={{ borderColor: 'rgba(var(--hextech-rgb), 0.22)', color: 'var(--text)' }}
              >
                ← Geri
              </button>
              <div className="menu-subflow-title flex min-w-0 flex-1 items-center justify-center gap-3 sm:justify-start">
                <span className="menu-subflow-icon grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl leading-none">
                  {topMode!.icon}
                </span>
                <div className="min-w-0 text-center sm:text-left">
                  <div className="font-display text-lg font-bold leading-tight" style={{ color: 'var(--gold-bright)' }}>
                    {topMode!.name}
                  </div>
                  <div className="truncate text-xs" style={{ color: 'var(--text-dim)' }}>
                    {topMode!.desc}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {top === 'daily' && <DailyPanel />}

          {/* Zorluk — kendi kartında, "Zorluk" etiketi + sağda karşılaştırma anahtarı */}
          {top !== 'daily' && (
            <div className="menu-subpanel menu-subpanel-difficulty hextech-frame rounded-[22px] border p-3 sm:p-4">
              <div className="menu-subpanel-head mb-3 flex flex-wrap items-start justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="font-display text-lg font-bold leading-tight" style={{ color: 'var(--gold-bright)' }}>
                    Zorluk
                  </div>
                </div>
                <button
                  onClick={() => setDiffInfo((v) => !v)}
                  className="menu-subpanel-link rounded-full border px-3 py-1 text-xs font-semibold"
                >
                  {diffInfo ? 'Gizle' : 'Seviyeler ne değiştiriyor?'}
                </button>
              </div>
              <div className="menu-difficulty-grid grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => pickDifficulty(d.id)}
                    aria-pressed={diff === d.id}
                    className={`menu-difficulty-chip menu-difficulty-chip-${d.id} card-btn rounded-xl border px-3 py-2.5 text-left ${diff === d.id ? 'is-active' : ''}`}
                  >
                    <span className="menu-difficulty-chip-label block text-sm font-bold sm:text-[15px]">
                      {d.name}
                    </span>
                    <span className="menu-difficulty-chip-meta mt-1 block text-[11px]">
                      {RULES[d.id].maxGuesses} hak · {RULES[d.id].timedSeconds} sn
                    </span>
                  </button>
                ))}
              </div>
              <p className="menu-difficulty-note mt-3 text-sm" style={{ color: 'var(--text-dim)' }}>
                {top === 'timed'
                  ? `İpuçları ve süre değişir (${RULES[diff].timedSeconds} sn) · skorlar seviye başına ayrı`
                  : 'İpuçlarının ne zaman açıldığını belirler · istatistikler seviye başına ayrı'}
              </p>
              {diffInfo && (
                <div className="menu-difficulty-table-shell menu-subpanel anim-pop mt-3 rounded-[20px] border p-3 sm:p-4">
                  <DifficultyTable />
                </div>
              )}
            </div>
          )}

          {/* Havuz filtresi — Günlük'te yok (herkes aynı bulmacayı çözmeli) */}
          {/* Havuz filtresi yalnız Sınırsız'da: Günlük'te herkes aynı bulmacayı çözmeli,
              Zamana Karşı'da ise skorlar sıralamaya gidiyor — daraltılmış havuz karşılaştırmayı bozar. */}
          {top === 'endless' && <PoolFilterPicker value={filter} onChange={pickFilter} />}

          {/* Mod seçimi bölgesi */}
          <section className={`menu-subgrid-shell menu-subpanel menu-subgrid-shell-${top} rounded-[22px] border p-3 sm:p-4`}>
            <div className="menu-subgrid-head mb-3 flex flex-wrap items-start justify-between gap-2.5">
              <div className="min-w-0">
                <div className="font-display text-lg font-bold leading-tight" style={{ color: 'var(--gold-bright)' }}>
                  Ne tahmin edeceksin?
                </div>
              </div>
              <p className="menu-subgrid-note max-w-[26rem] text-xs sm:text-sm" style={{ color: 'var(--text-dim)' }}>
                {top === 'timed'
                  ? 'Zorluk arttıkça süre kısalır, ipuçları sertleşir.'
                  : top === 'daily'
                    ? 'İlerleme gün sonunda sıfırlanır.'
                    : 'Zorluk ve havuz filtresi tüm alt modları birlikte etkiler.'}
              </p>
            </div>

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
                  <button
                    key={m.id}
                    onClick={() => onPlay(top, m.id, diff, filter)}
                    className={`menu-submode-card menu-submode-card-${top} card-btn group flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:scale-[1.01] ${dailyDone ? 'is-done' : ''}`}
                  >
                    <span className="menu-submode-icon grid h-11 w-11 shrink-0 place-items-center rounded-lg text-2xl">
                      {m.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold" style={{ color: 'var(--gold-bright)' }}>{m.name}</span>
                      <span className="block text-xs" style={{ color: 'var(--text-dim)' }}>{m.desc}</span>
                    </span>
                    {info && (
                      <span className={`menu-submode-info shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${dailyDone ? 'is-done' : ''}`}>
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
                <button
                  onClick={() => onPlay(top, 'mix', diff, filter)}
                  className={`menu-submode-card menu-submode-card-${top} menu-submode-card-mix card-btn mt-2.5 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all hover:scale-[1.01]`}
                >
                  <span className="menu-submode-icon menu-submode-icon-mix grid h-11 w-11 shrink-0 place-items-center rounded-lg text-2xl">
                    {MIX_MODE.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold" style={{ color: 'var(--gold-bright)' }}>{MIX_MODE.name}</span>
                    <span className="block text-xs" style={{ color: 'var(--text-dim)' }}>
                      {top === 'timed' ? 'Her soru başka tipten (Klasik hariç)' : 'Her soru başka tipten gelsin'}
                    </span>
                  </span>
                  {info && (
                    <span className="menu-submode-info shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                      {info}
                    </span>
                  )}
                </button>
              )
            })()}
          </section>
        </div>
      )}

      {playerGuideOpen && (
        <PlayerGuide
          onClose={() => setPlayerGuideOpen(false)}
          onChampions={() => {
            setPlayerGuideOpen(false)
            onChampions()
          }}
          onItems={() => {
            setPlayerGuideOpen(false)
            onItems()
          }}
          onHowTo={() => {
            setPlayerGuideOpen(false)
            onHowTo()
          }}
        />
      )}

      <footer className="relative z-10 mt-3 text-center text-xs opacity-75 sm:mt-4" style={{ color: 'var(--text-dim)' }}>
        Patch {PATCH} · Riot Games ile ilişkili değildir
      </footer>

      {rank && <RankModal best={dailyStreak.best} current={activeStreak} onClose={() => setRank(false)} />}
      {changelog && <Changelog onClose={() => { setChangelog(false); setUnseenNews(hasUnseenChangelog()) }} />}
      {onboarding && <Onboarding onClose={() => setOnboarding(false)} />}
      </div>
    </>
  )
}
