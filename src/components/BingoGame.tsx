import { useCallback, useEffect, useRef, useState } from 'react'
import { BINGO_SECONDS, BOX_COUNT, buildCard, championStream, dailyCard, type Criterion } from '../game/bingo'
import { DATA_VERSION, byId, squareUrl } from '../game/data'
import { cryptoRandInt, fnv1a, seededRng, todayKey } from '../game/rng'
import { playCorrect, playLose, playWin, playWrong } from '../game/sfx'
import { copyToClipboard } from '../game/share'
import { evaluateAchievements } from '../game/achievements'
import { BINGO_DAILY_KEY as KEY, isCurrentMiniDailyRecord } from '../game/miniDaily'
import { godMode } from '../game/dev'
import { getTimedSecondsLeft } from '../game/timed'
import WinConfetti from './game/WinConfetti'
import GameShell from './game/GameShell'
import { useModalFocusTrap } from './useModalFocusTrap'
import type { Champion } from '../game/types'

interface Props {
  daily: boolean // günlük: herkeste aynı kart ve aynı sıra, günde bir
  onExit: () => void
}

// KEY (vt:bingo:daily) miniDaily.ts'ten import edilir — menü göstergesiyle tek kaynak
const BEST_KEY = 'vt:bingo:best'
const WINS_KEY = 'vt:bingo:wins' // tam kart (12/12) tamamlama sayısı — rozet için

interface DailyState {
  date: string
  v?: string
  filled: number
  won: boolean
  // Oyun-ortası devam için (çıkıp dönünce kaldığı yerden):
  started?: boolean
  over?: boolean
  pos?: number
  filledIds?: (string | null)[] // kutu başına yerleştirilen şampiyon id'si
  left?: number // kalan saniye
}

function loadDaily(): DailyState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as DailyState
      if (isCurrentMiniDailyRecord(s, DATA_VERSION)) return s
    }
  } catch { /* yoksay */ }
  return { date: todayKey(), filled: 0, won: false }
}

/** Günlük kart + akış — tarihten deterministik; devam ederken birebir aynısı üretilir */
function dailyDeck() {
  const rand = seededRng(fnv1a(`${todayKey()}:bingo:akis`))
  const card = dailyCard()
  return { card, stream: championStream(card, rand) }
}

export default function BingoGame({ daily, onExit }: Props) {
  const sessionDate = useRef(todayKey()).current
  // God mode (yalnız yerel dev): kayıtlı günlüğü yükleme → kilit/devam yok, hep taze başlar
  const saved = daily && !godMode() ? loadDaily() : null
  // Yeni biçimde kayıt (filledIds var) → kartı ve süreyi geri yükleyebiliriz
  const canRestore = !!(saved && saved.started && Array.isArray(saved.filledIds))
  // Eski biçim ya da geri yüklenemeyen "bugün oynandı" → tekrar oynatma, kilitle
  const playedLocked = !!(saved && !canRestore && (saved.won || saved.filled > 0))
  const restoreDeck = canRestore ? dailyDeck() : null
  const restoredLeft = canRestore ? Math.max(0, Math.min(BINGO_SECONDS, saved?.left ?? BINGO_SECONDS)) : BINGO_SECONDS

  const [started, setStarted] = useState(canRestore)
  const [card, setCard] = useState<Criterion[]>(restoreDeck?.card ?? [])
  const [stream, setStream] = useState<Champion[]>(restoreDeck?.stream ?? [])
  const [pos, setPos] = useState(saved?.pos ?? 0)
  const [filled, setFilled] = useState<(Champion | null)[]>(() =>
    canRestore && saved?.filledIds
      ? saved.filledIds.map((id) => (id ? byId(id) ?? null : null))
      : new Array(BOX_COUNT).fill(null),
  )
  const [left, setLeft] = useState(restoredLeft)
  const [over, setOver] = useState(!!(canRestore && saved?.over))
  const [copied, setCopied] = useState(false)
  const [shake, setShake] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false) // çıkış onayı modalı
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef(canRestore ? Date.now() - (BINGO_SECONDS - restoredLeft) * 1000 : 0)
  const pausedMsRef = useRef(0)
  const pauseStartedAtRef = useRef<number | null>(null)
  const exitDialogRef = useModalFocusTrap<HTMLDivElement>(confirmExit)

  const current = stream[pos]
  const doldurulan = filled.filter(Boolean).length
  const won = doldurulan === BOX_COUNT
  // Geri yüklenmiş bitmiş günlük tekrar açılınca yeni galibiyet sayılmamalı.
  const winRecordedRef = useRef(won)
  const best = Number(localStorage.getItem(BEST_KEY) ?? 0)

  const refreshClock = useCallback((nowMs = Date.now()) => {
    if (!startedAtRef.current) return
    const activePauseMs = pauseStartedAtRef.current === null ? 0 : Math.max(0, nowMs - pauseStartedAtRef.current)
    const nextLeft = getTimedSecondsLeft(startedAtRef.current, BINGO_SECONDS, nowMs, {
      pausedMs: pausedMsRef.current + activePauseMs,
    })
    setLeft(nextLeft)
    if (nextLeft === 0) {
      if (timerRef.current) clearInterval(timerRef.current)
      setOver(true)
    }
  }, [])

  // Sayaç — `won` KONTROLÜ ŞART: kart tamamlanınca durmazsa geçen süre şişmeye
  // devam ediyordu ("Kart tamam! 82 saniye" sayısı artıyordu)
  useEffect(() => {
    if (!started || over || won) return
    refreshClock()
    timerRef.current = setInterval(() => refreshClock(Date.now()), 250)
    const onVisibilityChange = () => refreshClock(Date.now())
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [started, over, won, refreshClock])

  // Çıkış onayı açıkken süre durur — karar verirken süre akmasın.
  useEffect(() => {
    if (!started || over || won) return
    const now = Date.now()
    if (confirmExit) {
      if (pauseStartedAtRef.current === null) pauseStartedAtRef.current = now
    } else if (pauseStartedAtRef.current !== null) {
      pausedMsRef.current += Math.max(0, now - pauseStartedAtRef.current)
      pauseStartedAtRef.current = null
    }
    refreshClock(now)
  }, [confirmExit, started, over, won, refreshClock])

  // Bitiş: kayıt + ses
  useEffect(() => {
    if (!over && !won) return
    if (won) playWin(); else playLose()
    if (doldurulan > best) localStorage.setItem(BEST_KEY, String(doldurulan))
    // Gerçek oyun içi tam kartı yalnız bir kez say: StrictMode ve geri yükleme şişirmesin.
    if (won && !winRecordedRef.current) {
      winRecordedRef.current = true
      localStorage.setItem(WINS_KEY, String(Number(localStorage.getItem(WINS_KEY) ?? 0) + 1))
    }
    evaluateAchievements()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, won])

  // Günlük: ilerleme + kalan süre localStorage'a — çıkıp dönünce kaldığı yerden devam eder.
  // Her hamlede ve her saniyede yazılır (90 küçük yazım, sorun değil).
  useEffect(() => {
    if (!daily || !started) return
    const state: DailyState = {
      date: sessionDate,
      v: DATA_VERSION,
      filled: filled.filter(Boolean).length,
      won,
      started: true,
      over,
      pos,
      filledIds: filled.map((f) => f?.id ?? null),
      left,
    }
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [daily, sessionDate, started, filled, pos, left, over, won])

  /** Çıkış: günlük oyun sürüyorsa onay modalını aç — ilerleme ve süre korunur. */
  function handleExit() {
    if (daily && started && !over && !won) { setConfirmExit(true); return }
    onExit()
  }

  function start() {
    if (timerRef.current) clearInterval(timerRef.current)
    // Günlük: tarihten türeyen kart ve sıra → herkes aynı oyunu oynar
    const rand = daily ? seededRng(fnv1a(`${todayKey()}:bingo:akis`)) : () => cryptoRandInt(1e6) / 1e6
    const c = daily ? dailyCard() : buildCard(rand)
    setCard(c)
    setStream(championStream(c, rand))
    setPos(0)
    setFilled(new Array(BOX_COUNT).fill(null))
    startedAtRef.current = Date.now()
    pausedMsRef.current = 0
    pauseStartedAtRef.current = null
    setLeft(BINGO_SECONDS)
    setOver(false)
    // Yeni sınırsız tur kendi gerçek galibiyetini yeniden kaydedebilsin.
    winRecordedRef.current = false
    setStarted(true)
  }

  function place(i: number) {
    if (!current || over || won || filled[i]) return
    if (!card[i].test(current)) {
      // Yanlış kutu: ceza yok ama geri bildirim var — oyuncu neden olmadığını anlasın
      setShake(true)
      playWrong()
      return
    }
    const next = [...filled]
    next[i] = current
    setFilled(next)
    setPos((p) => p + 1)
    playCorrect()
  }

  function skip() {
    if (over || won) return
    setPos((p) => p + 1)
  }

  async function share() {
    const text = `Vadi Tahmini — Bingo${daily ? ` ${todayKey()}` : ''}\n${doldurulan}/${BOX_COUNT} kutu${won ? ` · ${BINGO_SECONDS - left} saniyede tamamladım! 🏆` : ''}`
    if (await copyToClipboard(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }


  return (
    <GameShell bg="/mg-bingo.png">
      {won && <WinConfetti />}
      <div className="flex w-full items-center justify-between gap-2 border-b pt-3 pb-2"
        style={{ borderColor: 'var(--border)' }}>
        <button onClick={handleExit} className="card-btn rounded-xl border px-3 py-1.5 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
          ← Menü
        </button>
        <span className="font-display font-semibold" style={{ color: 'var(--gold)' }}>
          Bingo {daily && '· Günlük'}
        </span>
        {started && !over && !won ? (
          <span className="flex items-center gap-2">
            <span className="text-sm tabular-nums" style={{ color: 'var(--text-dim)' }}>
              <b style={{ color: 'var(--gold)' }}>{doldurulan}</b>/{BOX_COUNT}
            </span>
            <span className={`rounded-xl px-3 py-1.5 font-mono font-bold ${left <= 15 ? 'anim-pulse' : ''}`}
              style={{ background: left <= 15 ? 'var(--danger)' : 'var(--bg-card)', color: '#fff' }}>
              {left}s
            </span>
          </span>
        ) : <span className="w-14" />}
      </div>

      {!started && (
        <div className="flex flex-col items-center gap-4 pt-8 text-center">
          <div className="text-5xl">🎲</div>
          <h2 className="font-display text-xl font-bold">Bingo{daily && ' · Günlük'}</h2>
          <p className="max-w-sm text-sm" style={{ color: 'var(--text)' }}>
            {BOX_COUNT} kutunun her birinde bir ölçüt var. Ekrana gelen şampiyonu uyduğu kutuya yerleştir.
            Uymuyorsa <b>Pas</b> ile geç. Süre: <b>{BINGO_SECONDS} saniye</b>.
          </p>
          {best > 0 && <p className="text-sm" style={{ color: 'var(--text-dim)' }}>En iyin: <b style={{ color: 'var(--gold)' }}>{best}/{BOX_COUNT}</b></p>}
          {playedLocked ? (
            // Bugünkü Günlük zaten oynandı → tekrar oynatma
            <>
              <p className="text-sm" style={{ color: 'var(--gold)' }}>
                Bugünkü Günlük Bingo'yu zaten oynadın{saved?.won ? ' — tam kart 🏆' : ` — ${saved?.filled}/${BOX_COUNT} kutu`}.
              </p>
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Yarın yeni kart seni bekliyor.</p>
            </>
          ) : (
            <button onClick={start} className="btn-gold rounded-xl px-8 py-3 text-lg font-bold">
              Başla
            </button>
          )}
        </div>
      )}

      {started && (
        <>
          {/* İlerleme çubuğu — kaç kutu doldu, tek bakışta */}
          <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-input)' }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${(doldurulan / BOX_COUNT) * 100}%`, background: 'var(--gold)' }} />
          </div>

          {/* Sıradaki şampiyon — hangi kutuya uyduğu SÖYLENMEZ (kullanıcı isteği) */}
          {!over && !won && current && (
            <div className={`flex w-full items-center gap-4 rounded-2xl border p-3 ${shake ? 'anim-shake' : ''}`}
              style={{ borderColor: 'var(--gold)', background: 'var(--bg-card)' }}
              onAnimationEnd={() => setShake(false)}>
              <img src={squareUrl(current.id)} alt="" className="h-16 w-16 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="font-display text-xl font-bold" style={{ color: 'var(--gold-bright)' }}>{current.name}</div>
                <div className="truncate text-xs" style={{ color: 'var(--text-dim)' }}>{current.title}</div>
              </div>
              <button onClick={skip} className="card-btn shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold"
                style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
                Pas
              </button>
            </div>
          )}

          {/* Kart — hangi kutunun uyduğu belli EDİLMEZ, oyuncu bilecek */}
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {card.map((k, i) => {
              const f = filled[i]
              return (
                <button key={k.id} onClick={() => place(i)} disabled={!!f || over || won}
                  className="card-btn relative flex aspect-[4/3] flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border p-2 text-center"
                  style={{
                    borderColor: f ? 'var(--correct)' : 'var(--border)',
                    background: f ? 'rgba(var(--correct-rgb), 0.12)' : 'var(--bg-card)',
                  }}>
                  {/* Kutu numarası — konuşurken "3. kutu" demek kolaylaşsın */}
                  <span className="absolute left-1.5 top-1 text-xs tabular-nums" style={{ color: 'var(--text-dim)', opacity: 0.5 }}>
                    {i + 1}
                  </span>
                  {f ? (
                    <>
                      <img src={squareUrl(f.id)} alt="" className="h-9 w-9 rounded-md" />
                      <span className="max-w-full truncate text-xs font-semibold" style={{ color: 'var(--correct)' }}>
                        {f.name}
                      </span>
                      <span className="max-w-full truncate text-xs" style={{ color: 'var(--text-dim)' }}>{k.label}</span>
                    </>
                  ) : (
                    <span className="px-1 text-sm font-semibold leading-tight" style={{ color: 'var(--text)' }}>
                      {k.label}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {(over || won) && (
            <div className="anim-pop flex w-full flex-col items-center gap-3 rounded-xl border p-4 text-center"
              style={{ borderColor: won ? 'var(--correct)' : 'var(--danger)', background: 'var(--bg-card)' }}>
              <span className="font-display text-lg font-bold" style={{ color: won ? 'var(--correct)' : 'var(--danger-text)' }}>
                {won ? `🏆 Kart tamam! ${BINGO_SECONDS - left} saniye` : `⏱ Süre bitti — ${doldurulan}/${BOX_COUNT} kutu`}
              </span>
              <div className="flex flex-wrap justify-center gap-3">
                {!daily && (
                  <button onClick={start} className="btn-gold rounded-xl px-6 py-2.5 font-bold">
                    Tekrar
                  </button>
                )}
                <button onClick={share} className="card-btn rounded-xl border px-5 py-2.5 font-bold"
                  style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
                  {copied ? '✓ Kopyalandı' : 'Paylaş'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Çıkış onayı — tarayıcının yerleşik confirm'i yerine tema uyumlu modal */}
      {confirmExit && (
        <div className="ovl fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)' }} onClick={() => setConfirmExit(false)}>
          <div ref={exitDialogRef} className="panel anim-pop w-full max-w-sm rounded-2xl border p-5 text-center"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--gold)' }}
            onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Çıkış onayı">
            <div className="mb-2 text-4xl">🚪</div>
            <h3 className="font-display text-lg font-bold" style={{ color: 'var(--gold-bright)' }}>
              Çıkmak istediğine emin misin?
            </h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-dim)' }}>
              İlerlemen ve <b style={{ color: 'var(--gold)' }}>kalan süren ({left}s)</b> kaydedilecek — geri
              döndüğünde tam kaldığın yerden devam edeceksin.
            </p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setConfirmExit(false)}
                className="card-btn flex-1 rounded-xl border px-4 py-2.5 font-bold"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                Oynamaya devam
              </button>
              <button onClick={onExit} className="btn-gold flex-1 rounded-xl px-4 py-2.5 font-bold">
                Kaydet & çık
              </button>
            </div>
          </div>
        </div>
      )}
    </GameShell>
  )
}
