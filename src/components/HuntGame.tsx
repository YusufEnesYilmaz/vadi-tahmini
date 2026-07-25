import { useEffect, useMemo, useRef, useState } from 'react'
import { CHAMPIONS, byId, squareUrl } from '../game/data'
import { copyToClipboard } from '../game/share'
import { playLose, playWin, playWrong } from '../game/sfx'
import { todayKey } from '../game/rng'
import {
  HUNT_ALPHABET,
  HUNT_HINT_TIERS,
  HUNT_MAX_ATTEMPTS,
  dailyHuntTarget,
  evaluateHuntGuess,
  huntHintText,
  lettersInRange,
  loadDailyHunt,
  narrowRange,
  randomHuntTarget,
  recordHuntWin,
  saveDailyHunt,
} from '../game/hunt'
import { evaluateAchievements } from '../game/achievements'
import type { Champion } from '../game/types'
import Autocomplete, { type AcOption } from './Autocomplete'
import WinConfetti from './game/WinConfetti'
import GameShell from './game/GameShell'
import { useModalFocusTrap } from './useModalFocusTrap'

interface Props {
  daily?: boolean
  onExit: () => void
}

/** Mesafe → renk sıcaklığı (yaklaştıkça ısınır) */
function heatColor(d: number): string {
  if (d <= 3) return 'var(--gold-bright)'
  if (d <= 10) return 'var(--partial)'
  return 'var(--text-dim)'
}

function heatEmoji(d: number): string {
  if (d === 0) return '🎯'
  if (d <= 3) return '🔥'
  if (d <= 10) return '♨️'
  return '❄️'
}

/**
 * Şampiyon Avı — hedefi alfabetik mesafe + yön ipuçlarıyla bul (8 hak).
 * İPUCU İSTEK ÜZERİNE (2026-07-24): ön seçmeli zorluk yok; "İpucu aç" bölge sonra
 * türü açar, HER kademe 1 HAK yakar → "takıldım mı, hak harcayıp ipucu alayım mı"
 * her turda gerçek bir karar. Başlangıç ekranı yok; kurallar "?" modalında.
 */
export default function HuntGame({ daily = false, onExit }: Props) {
  const sessionDate = useRef(todayKey()).current
  const [target, setTarget] = useState<Champion>(() => {
    if (daily) {
      const saved = loadDailyHunt()
      const t = saved && byId(saved.targetId)
      if (t) return t
      return dailyHuntTarget()
    }
    return randomHuntTarget()
  })
  const [guesses, setGuesses] = useState<string[]>(() => (daily ? loadDailyHunt()?.guessIds ?? [] : []))
  const [hints, setHints] = useState<number>(() => (daily ? loadDailyHunt()?.hints ?? 0 : 0))
  const [showHowTo, setShowHowTo] = useState(false)
  const [copied, setCopied] = useState(false)
  const [announce, setAnnounce] = useState('')
  const howToDialogRef = useModalFocusTrap<HTMLDivElement>(showHowTo)

  // İpucu HER kademesi 1 hak yakar → kullanılan hak = tahmin + ipucu
  const attemptsUsed = guesses.length + hints
  const remaining = HUNT_MAX_ATTEMPTS - attemptsUsed
  const won = guesses.includes(target.id)
  const over = won || attemptsUsed >= HUNT_MAX_ATTEMPTS
  const feedbacks = useMemo(() => guesses.map((g) => ({ id: g, ...evaluateHuntGuess(target.id, g) })), [guesses, target])
  const [lo, hi] = useMemo(() => narrowRange(target.id, guesses), [guesses, target])
  const openLetters = useMemo(() => lettersInRange(lo, hi), [lo, hi])
  const hintText = huntHintText(target, hints)

  // Escape = modal kapat
  useEffect(() => {
    if (!showHowTo) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowHowTo(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showHowTo])

  const options: AcOption[] = useMemo(
    () => CHAMPIONS.map((c) => ({ key: c.id, label: c.name, img: squareUrl(c.id) })),
    [],
  )
  const guessedSet = useMemo(() => new Set(guesses), [guesses])

  const persist = (nextGuesses: string[], nextHints: number, isOver: boolean, isWon: boolean) => {
    if (!daily) return
    saveDailyHunt({ date: sessionDate, targetId: target.id, guessIds: nextGuesses, hints: nextHints, over: isOver, won: isWon })
  }

  function pick(id: string) {
    if (over || guessedSet.has(id)) return
    const next = [...guesses, id]
    setGuesses(next)
    const fb = evaluateHuntGuess(target.id, id)
    const isWon = fb.distance === 0
    const isOver = isWon || next.length + hints >= HUNT_MAX_ATTEMPTS
    if (isWon) {
      playWin()
      setAnnounce(`Doğru: ${target.name}! ${next.length} denemede buldun.`)
      // Rozet: ipucu da hak yaktığı için "Usta Avcı ≤4" ipucu kullananı kayırmasın
      recordHuntWin(next.length + hints)
      evaluateAchievements()
    } else if (isOver) {
      playLose()
      setAnnounce(`Hakkın bitti. Cevap: ${target.name}.`)
    } else {
      playWrong()
      const dirText = fb.dir === 'after' ? 'alfabetik olarak SONRA' : 'alfabetik olarak ÖNCE'
      setAnnounce(`${byId(id)?.name}: hedef ${fb.distance} sıra uzakta, ${dirText}. ${HUNT_MAX_ATTEMPTS - next.length - hints} hakkın kaldı.`)
    }
    persist(next, hints, isOver, isWon)
  }

  function revealHint() {
    if (over || hints >= HUNT_HINT_TIERS || remaining <= 1) return
    const next = hints + 1
    setHints(next)
    playWrong()
    setAnnounce(`İpucu açıldı: ${huntHintText(target, next)}. 1 hak yandı, ${HUNT_MAX_ATTEMPTS - guesses.length - next} hakkın kaldı.`)
    persist(guesses, next, false, false)
  }

  function newRound() {
    setTarget((prev) => randomHuntTarget(prev.id))
    setGuesses([])
    setHints(0)
    setCopied(false)
  }

  async function share() {
    const head = won ? `${attemptsUsed}/${HUNT_MAX_ATTEMPTS}` : `X/${HUNT_MAX_ATTEMPTS}`
    const trail = '🔎'.repeat(hints) + feedbacks.map((f) => heatEmoji(f.distance)).join('')
    const text = `Vadi Tahmini — Şampiyon Avı${daily ? ` ${todayKey()}` : ''} ${head}\n${trail}`
    if (await copyToClipboard(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <GameShell bg="/mg-hunt.png">
      {won && <WinConfetti />}
      {/* Üst bar */}
      <div className="flex w-full items-center justify-between gap-2 border-b pt-3 pb-2"
        style={{ borderColor: 'var(--border)' }}>
        <button onClick={onExit} className="card-btn rounded-xl border px-3 py-1.5 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
          ← Menü
        </button>
        <span className="font-display font-semibold" style={{ color: 'var(--gold)' }}>
          🏹 Şampiyon Avı {daily && '· Günlük'}
        </span>
        <button onClick={() => setShowHowTo(true)} aria-label="Nasıl oynanır"
          className="card-btn h-8 w-8 rounded-xl border text-sm font-bold"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
          ?
        </button>
      </div>

      <div aria-live="polite" className="sr-only">{announce}</div>

      {/* Kalan hak göstergesi (elmas) */}
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Kalan hak</span>
        <span className="text-sm font-semibold tracking-widest" style={{ color: remaining <= 2 ? 'var(--danger-text)' : 'var(--gold)' }}>
          {Array.from({ length: HUNT_MAX_ATTEMPTS }, (_, i) => (i < remaining ? '◆' : '◇')).join('')}
        </span>
      </div>

      {/* İpucu satırı: açılan ipuçları + "İpucu aç" butonu */}
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        {hintText ? (
          <span className="anim-pop rounded-full border px-3 py-1 text-xs font-bold"
            style={{ borderColor: 'var(--gold)', color: 'var(--gold)', background: 'rgba(var(--gold-glow-rgb),0.06)' }}>
            🔎 {hintText}
          </span>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>🕶 Henüz ipucu yok</span>
        )}
        {!over && hints < HUNT_HINT_TIERS && (
          <button onClick={revealHint} disabled={remaining <= 1}
            className="card-btn rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-40"
            style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}
            title={remaining <= 1 ? 'Son hakkını ipucuna harcayamazsın' : 'İpucu 1 hak yakar'}>
            🔎 {hints === 0 ? 'İpucu aç' : 'Bir ipucu daha'} · 1 hak
          </button>
        )}
      </div>

      {/* A–Z şeridi: mümkün aralık dışındaki baş harfler söner */}
      <div className="flex w-full flex-wrap justify-center gap-1">
        {HUNT_ALPHABET.map((L) => {
          const openL = openLetters.has(L)
          return (
            <span key={L}
              className="grid h-6 w-6 place-items-center rounded-md border text-[11px] font-bold transition-opacity"
              style={{
                borderColor: openL ? 'var(--gold)' : 'var(--border)',
                color: openL ? 'var(--gold)' : 'var(--text-dim)',
                opacity: openL ? 1 : 0.25,
              }}>
              {L}
            </span>
          )
        })}
      </div>

      {/* Giriş */}
      {!over && (
        <div className="w-full">
          <Autocomplete options={options} placeholder="Şampiyon adı yaz..."
            disabledKeys={guessedSet} onPick={pick} autoFocus />
          <p className="mt-1 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
            Mesafe = alfabetik sırada aradaki şampiyon sayısı · yön oku hedefin tarafını gösterir
          </p>
        </div>
      )}

      {/* Tahmin satırları (en yeni üstte) */}
      {feedbacks.length > 0 && (
        <div className="flex w-full flex-col gap-1.5">
          {[...feedbacks].reverse().map((f, i) => {
            const c = byId(f.id)
            if (!c) return null
            return (
              <div key={f.id} className={`flex items-center gap-3 rounded-xl border p-2 ${i === 0 ? 'anim-pop' : ''}`}
                style={{
                  borderColor: f.dir === 'correct' ? 'var(--correct)' : 'var(--border)',
                  background: f.dir === 'correct' ? 'rgba(var(--correct-rgb),0.10)' : 'var(--bg-card)',
                }}>
                <img src={squareUrl(c.id)} alt="" loading="lazy"
                  className="h-9 w-9 rounded-lg border object-cover" style={{ borderColor: 'var(--border)' }} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {c.name}
                </span>
                {f.dir === 'correct' ? (
                  <span className="text-sm font-bold" style={{ color: 'var(--correct)' }}>✓ Buldun!</span>
                ) : (
                  <span className="flex items-center gap-2 text-sm font-bold" style={{ color: heatColor(f.distance) }}>
                    <span>{heatEmoji(f.distance)}</span>
                    <span>{f.distance}</span>
                    <span aria-label={f.dir === 'after' ? 'hedef alfabetik olarak sonra' : 'hedef alfabetik olarak önce'}>
                      {f.dir === 'after' ? '↓' : '↑'}
                    </span>
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Sonuç kartı */}
      {over && (
        <div className="anim-pop w-full rounded-2xl border p-5 text-center"
          style={{
            borderColor: won ? 'var(--correct)' : 'var(--danger)',
            background: 'var(--bg-card)',
            boxShadow: 'var(--shadow-card)',
          }}>
          <img src={squareUrl(target.id)} alt="" className="mx-auto h-16 w-16 rounded-xl border object-cover"
            style={{ borderColor: won ? 'var(--correct)' : 'var(--danger)' }} />
          <h2 className="font-display mt-2 text-xl font-bold" style={{ color: won ? 'var(--correct)' : 'var(--danger-text)' }}>
            {won ? `${target.name}! Avı ${attemptsUsed} hakta bitirdin.` : `Av kaçtı — cevap ${target.name}`}
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>
            {won
              ? hints > 0 ? `${guesses.length} tahmin + ${hints} ipucu.` : 'Hiç ipucu kullanmadın — keskin!'
              : `${HUNT_MAX_ATTEMPTS} hakkın doldu.`}
          </p>
          <div className="mt-4 flex gap-2">
            <button onClick={share} className="card-btn flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold"
              style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
              {copied ? '✓ Kopyalandı' : 'Paylaş'}
            </button>
            {!daily && (
              <button onClick={newRound} className="btn-gold flex-1 rounded-xl px-4 py-2.5 text-sm font-bold">
                Yeni Av
              </button>
            )}
          </div>
        </div>
      )}

      {/* Nasıl oynanır modalı */}
      {showHowTo && (
        <div className="ovl fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)' }} onClick={() => setShowHowTo(false)}>
          <div ref={howToDialogRef} className="panel anim-pop w-full max-w-sm rounded-2xl border p-5"
            role="dialog" aria-modal="true" aria-label="Şampiyon Avı kuralları"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-base font-bold" style={{ color: 'var(--gold)' }}>
              🏹 Şampiyon Avı kuralları
            </h3>
            <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--text-dim)' }}>
              <p>1. Gizli hedef şampiyonu bul — toplam {HUNT_MAX_ATTEMPTS} hakkın var.</p>
              <p>2. Her tahmin iki şey söyler: hedefe <b style={{ color: 'var(--text)' }}>alfabetik sırada kaç şampiyon uzakta</b> olduğu ve <b style={{ color: 'var(--text)' }}>önce mi sonra mı</b> geldiği (↑/↓).</p>
              <p>3. Takılırsan <b style={{ color: 'var(--gold)' }}>🔎 İpucu aç</b> ile sırayla bölgeyi, rolü ve türü öğrenebilirsin — ama <b style={{ color: 'var(--text)' }}>her ipucu 1 hak yakar</b>.</p>
              <p>4. A–Z şeridi mümkün aralığı gösterir; sönen harfler elenmiştir.</p>
              <p>5. Adlar özel işaretler atılarak sıralanır (Kai'Sa → KAISA).</p>
            </div>
            <button onClick={() => setShowHowTo(false)}
              className="card-btn mt-4 w-full rounded-xl border px-4 py-2.5 text-sm font-semibold"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              Anladım
            </button>
          </div>
        </div>
      )}
    </GameShell>
  )
}
