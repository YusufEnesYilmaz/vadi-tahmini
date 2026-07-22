import { useState } from 'react'
import { PATCH } from '../game/data'
import { getDifficulty, RULES, setDifficulty as saveDifficulty } from '../game/difficulty'
import { getFilter, setFilter as saveFilter, type PoolFilter } from '../game/filter'
import { getBestScore, getDailyState, getStats } from '../game/stats'
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

interface Props {
  onPlay: (top: TopMode, sub: PlaySub, diff: Difficulty, filter: PoolFilter) => void
  onSettings: () => void
  /** Mini oyunlar ayrı ekran — alt mod yapısına oturmuyorlar */
  onMiniGame: (game: 'wordle' | 'bingo', daily: boolean) => void
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
  const updateReady = useUpdateAvailable()

  function pickDifficulty(d: Difficulty) {
    setDiff(d)
    saveDifficulty(d) // tercih hatırlansın
  }

  function pickFilter(f: PoolFilter) {
    setFilterState(f)
    saveFilter(f) // tercih hatırlansın
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 pb-10 pt-12">
      <header className="anim-pop text-center">
        <h1 className="text-shimmer font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Vadi Tahmini
        </h1>
        {/* Altın süsleme çizgisi: başlığı zeminden ayırır, LoL'ün süslü başlık diline gönderme */}
        <div className="mx-auto mt-2 flex items-center justify-center gap-2" aria-hidden>
          <span className="h-px w-10" style={{ background: 'linear-gradient(90deg, transparent, var(--gold))' }} />
          <span style={{ color: 'var(--gold)' }}>◆</span>
          <span className="h-px w-10" style={{ background: 'linear-gradient(90deg, var(--gold), transparent)' }} />
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-dim)' }}>
          Bil bakalım, şampiyon kim?
        </p>
      </header>

      {!top ? (
        <div className="stagger flex w-full flex-col gap-3">
          {/* Masaüstünde üç mod yan yana — tek sütun geniş kapta boşluğa yayılıyordu */}
          <div className="grid gap-3 sm:grid-cols-3">
            {TOP_MODES.map((m) => (
              <button key={m.id} onClick={() => setTop(m.id)}
                className="card-btn flex items-center gap-4 rounded-xl border p-4 text-left sm:flex-col sm:items-start"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <span className="text-3xl">{m.icon}</span>
                <span>
                  <span className="block text-lg font-bold" style={{ color: 'var(--gold-bright)' }}>{m.name}</span>
                  <span className="block text-sm" style={{ color: 'var(--text-dim)' }}>{m.desc}</span>
                </span>
              </button>
            ))}
          </div>
          {/*
            Mini oyunlar: üst/alt mod hiyerarşisine girmiyorlar (Kelime harf harf
            giriş, Bingo süreli ızgara). Ayrı bölüm olarak duruyorlar.
          */}
          <div className="mt-2">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
              Mini oyunlar
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                { id: 'wordle' as const, icon: '🔡', name: 'Kelime', desc: 'Adı harf harf bul, 6 hak' },
                { id: 'bingo' as const, icon: '🎲', name: 'Bingo', desc: '90 saniyede 12 kutu' },
              ]).map((g) => (
                <div key={g.id} className="overflow-hidden rounded-xl border"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3 p-4 pb-3">
                    <span className="text-3xl">{g.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-bold" style={{ color: 'var(--gold-bright)' }}>{g.name}</span>
                      <span className="block text-sm" style={{ color: 'var(--text-dim)' }}>{g.desc}</span>
                    </span>
                  </div>
                  {/* İki oynanış tek şeritte — kart içinde ayrı butonlar dağınık duruyordu */}
                  <div className="flex border-t" style={{ borderColor: 'var(--border)' }}>
                    <button onClick={() => onMiniGame(g.id, false)}
                      className="flex-1 py-2.5 text-sm font-bold transition-colors hover:bg-[var(--bg-input)]"
                      style={{ color: 'var(--gold)' }}>
                      ∞ Sınırsız
                    </button>
                    <button onClick={() => onMiniGame(g.id, true)}
                      className="flex-1 border-l py-2.5 text-sm font-bold transition-colors hover:bg-[var(--bg-input)]"
                      style={{ borderColor: 'var(--border)', color: 'var(--gold)' }}>
                      📅 Günlük
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-2 w-full">
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setHowTo(true)} className="card-btn rounded-xl border p-3 text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
                ❓ Nasıl
              </button>
              <button onClick={() => setStats(true)} className="card-btn rounded-xl border p-3 text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
                📊 İstatistik
              </button>
              <button onClick={onSettings} className="card-btn relative rounded-xl border p-3 text-sm"
                style={{
                  borderColor: updateReady ? 'var(--gold)' : 'var(--border)',
                  color: updateReady ? 'var(--gold)' : 'var(--text-dim)',
                }}>
                ⚙ Ayarlar
                {/* Yeni sürüm hazırsa altın baloncuk — kullanıcı Ayarlar'a girip güncellesin */}
                {updateReady && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5" aria-label="Yeni sürüm hazır" title="Yeni sürüm hazır">
                    <span className="anim-ping absolute inline-flex h-full w-full rounded-full" style={{ background: 'var(--gold)' }} />
                    <span className="relative inline-flex h-3.5 w-3.5 rounded-full border" style={{ background: 'var(--gold)', borderColor: 'var(--bg)' }} />
                  </span>
                )}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setAchievements(true)} className="card-btn rounded-xl border p-3 text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--gold)' }}>
                🏆 Başarım
              </button>
              <button onClick={() => setLeaderboard(true)} className="card-btn rounded-xl border p-3 text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--gold)' }}>
                🥇 Sıralama
              </button>
              <button onClick={() => setCalendar(true)} className="card-btn rounded-xl border p-3 text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--gold)' }}>
                📅 Takvim
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="stagger flex w-full flex-col gap-4">
          {/* Başlık: geri + üst modun kimliği (ikon + ad + kısa açıklama), ortalı */}
          <div className="flex items-center gap-2">
            <button onClick={() => setTop(null)} className="card-btn flex w-[72px] shrink-0 justify-center rounded-xl border px-3 py-1.5 text-sm"
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
                    className="card-btn flex items-center gap-3 rounded-xl border p-3 text-left"
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
                  className="card-btn mt-2.5 flex w-full items-center gap-3 rounded-xl border p-3 text-left"
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

      <footer className="mt-4 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
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
