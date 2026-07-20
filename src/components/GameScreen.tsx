import { useEffect, useMemo, useRef, useState } from 'react'
import { evaluateGuess, type ClassicRow } from '../game/classic'
import { byId, CHAMPIONS, squareUrl } from '../game/data'
import { nextPuzzle, type Puzzle } from '../game/puzzle'
import { copyToClipboard, shareDailyClassic, shareDailySimple, shareTimed } from '../game/share'
import { getBestScore, getDailyState, recordGame, recordScore, saveDailyState, getStats } from '../game/stats'
import { rulesFor } from '../game/difficulty'
import { DIFFICULTIES, SUB_MODES, TOP_MODES, type Difficulty, type SubMode, type TopMode } from '../game/types'
import Autocomplete, { type AcOption } from './Autocomplete'
import ClassicBoard from './ClassicBoard'
import HowTo from './HowTo'
import PuzzleView from './PuzzleView'

interface Props {
  top: TopMode
  sub: SubMode
  diff: Difficulty
  onExit: () => void
}

/** Yetenek bonusu: 0=Pasif, 1..4 = Q W E R (puzzle.spellIndex ile aynı sıra) */
const SLOT_LABELS = ['Pasif', 'Q', 'W', 'E', 'R']

function championOptions(): AcOption[] {
  return CHAMPIONS.map((c) => ({ key: c.id, label: c.name, img: squareUrl(c.id) }))
}

function skinOptions(): AcOption[] {
  const opts: AcOption[] = []
  for (const c of CHAMPIONS)
    for (const s of c.skins)
      opts.push({ key: `${c.id}:${s.num}`, label: s.name, sub: c.name, img: squareUrl(c.id) })
  return opts
}

function isCorrect(puzzle: Puzzle, guessKey: string): boolean {
  if (puzzle.sub === 'skin') return guessKey === `${puzzle.champion.id}:${puzzle.skin?.num}`
  return guessKey === puzzle.champion.id
}

function answerLabel(puzzle: Puzzle): string {
  return puzzle.sub === 'skin' ? `${puzzle.skin?.name}` : puzzle.champion.name
}

export default function GameScreen({ top, sub, diff, onExit }: Props) {
  const daily = top === 'daily'
  const timed = top === 'timed'
  const rules = rulesFor(top, diff)
  const TIMED_SECONDS = rules.timedSeconds

  const [puzzle, setPuzzle] = useState<Puzzle | null>(() => (timed ? null : nextPuzzle(top, sub)))
  const [guesses, setGuesses] = useState<string[]>(() => (daily ? getDailyState(sub).guesses : []))
  const [won, setWon] = useState<boolean>(() => (daily ? getDailyState(sub).won : false))
  const [copied, setCopied] = useState(false)
  const [shaking, setShaking] = useState(false) // yanlış tahminde giriş alanı titrer
  const [howTo, setHowTo] = useState(false)
  // Yetenek modu bonusu: şampiyon bilindikten sonra "hangi tuş?" — null = henüz cevaplanmadı
  const [slotGuess, setSlotGuess] = useState<number | null>(() => (daily ? getDailyState(sub).slot ?? null : null))

  // Zamana Karşı
  const [timeLeft, setTimeLeft] = useState(TIMED_SECONDS)
  const [score, setScore] = useState(0)
  const [timedOver, setTimedOver] = useState(false)
  const [wasRecord, setWasRecord] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const options = useMemo(() => (sub === 'skin' ? skinOptions() : championOptions()), [sub])
  const guessedSet = useMemo(() => new Set(guesses), [guesses])

  const rows: ClassicRow[] = useMemo(() => {
    if (sub !== 'classic' || !puzzle) return []
    return guesses
      .map((id) => byId(id))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => evaluateGuess(c, puzzle.champion, rules.showPartial))
      .reverse() // en yeni üstte
  }, [guesses, puzzle, sub, rules.showPartial])

  const finished = won || timedOver

  const bonusMode = sub === 'ability'
  const awaitingSlot = bonusMode && won && slotGuess === null // tur bitmedi: tuş bekleniyor
  const slotOk = bonusMode && puzzle && slotGuess !== null ? slotGuess === (puzzle.spellIndex ?? 0) : undefined

  // Zamana Karşı sayacı
  useEffect(() => {
    if (!timed || !puzzle || timedOver) return
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          setTimedOver(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [timed, puzzle, timedOver])

  // Zamana Karşı bitti → rekor kaydet (kayıt sonrası "En iyi" güncel görünsün diye state'e al)
  useEffect(() => {
    if (timedOver) setWasRecord(recordScore(sub, diff, score))
  }, [timedOver, sub, diff, score])

  function handleGuess(key: string) {
    if (!puzzle || finished) return
    const newGuesses = [...guesses, key]
    setGuesses(newGuesses)

    const correct = isCorrect(puzzle, key)
    if (!correct) setShaking(true)
    if (timed) {
      if (correct) {
        // Yetenek modunda tur bonus sorusuyla biter — skor orada işlenir
        if (bonusMode) { setWon(true); return }
        setScore((s) => s + 1)
        setGuesses([])
        setPuzzle(nextPuzzle(top, sub))
      }
      return
    }

    if (correct) {
      setWon(true)
      recordGame(top, sub, diff, true, newGuesses.length)
    }
    if (daily) {
      saveDailyState(sub, { date: getDailyState(sub).date, guesses: newGuesses, done: correct, won: correct })
    }
  }

  /** Yetenek bonusu: tuş seçimi. Zamana Karşı'da doğru tuş +1 puan getirir. */
  function handleSlot(idx: number) {
    if (!puzzle || slotGuess !== null) return
    setSlotGuess(idx)
    if (timed) {
      setScore((s) => s + 1 + (idx === (puzzle.spellIndex ?? 0) ? 1 : 0))
    } else if (daily) {
      saveDailyState(sub, { ...getDailyState(sub), slot: idx })
    }
  }

  function nextRound() {
    setGuesses([])
    setWon(false)
    setCopied(false)
    setSlotGuess(null)
    setPuzzle(nextPuzzle(top, sub))
  }

  function startTimed() {
    setScore(0)
    setTimeLeft(TIMED_SECONDS)
    setTimedOver(false)
    setWasRecord(false)
    setGuesses([])
    setWon(false)
    setSlotGuess(null)
    setPuzzle(nextPuzzle(top, sub))
  }

  async function share() {
    let text: string
    if (timed) text = shareTimed(sub, score, wasRecord)
    else if (sub === 'classic') text = shareDailyClassic([...rows].reverse(), won)
    else text = shareDailySimple(sub, guesses.length, won, slotOk)
    if (await copyToClipboard(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const topName = TOP_MODES.find((m) => m.id === top)!.name
  const subName = SUB_MODES.find((m) => m.id === sub)!.name
  const stats = getStats(top, sub, diff)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-3 pb-10">
      {/* Üst çubuk — altında ince altın ayraç (Wordle referansındaki gibi) */}
      <div className="flex w-full items-center justify-between gap-2 border-b pt-3 pb-2"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <button onClick={onExit} className="card-btn rounded-lg border px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            ← Menü
          </button>
          <button onClick={() => setHowTo(true)} aria-label="Nasıl oynanır"
            className="card-btn rounded-lg border px-2.5 py-1.5 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            ?
          </button>
        </div>
        <span className="min-w-0 truncate text-center text-sm font-semibold sm:text-base" style={{ color: 'var(--gold)' }}>
          {topName} · {subName}
          {!daily && (
            <span className="block text-[11px] font-normal" style={{ color: 'var(--text-dim)' }}>
              {DIFFICULTIES.find((d) => d.id === diff)!.name}
            </span>
          )}
        </span>
        {timed && puzzle && !timedOver ? (
          <span className={`rounded-lg px-3 py-1.5 font-mono text-lg font-bold ${timeLeft <= 10 ? 'anim-pulse' : ''}`}
            style={{ background: timeLeft <= 10 ? 'var(--danger)' : 'var(--bg-card)', color: '#fff' }}>
            {timeLeft}s
          </span>
        ) : (
          <span className="w-16 text-right text-sm" style={{ color: 'var(--text-dim)' }}>
            {timed ? `⏱` : `Seri: ${stats.currentStreak}`}
          </span>
        )}
      </div>

      {/* Zamana Karşı: başlangıç ekranı */}
      {timed && !puzzle && (
        <div className="flex flex-col items-center gap-4 pt-10 text-center">
          <div className="text-5xl">⏱</div>
          <h2 className="text-xl font-bold">Zamana Karşı — {subName}</h2>
          <p style={{ color: 'var(--text-dim)' }}>
            {TIMED_SECONDS} saniyede kaç tane bilebilirsin?<br />
            Bilemediğini "Pas" ile geçebilirsin.
          </p>
          <p className="text-sm" style={{ color: 'var(--text-dim)' }}>En iyi skorun: <b style={{ color: 'var(--gold)' }}>{getBestScore(sub, diff)}</b></p>
          <button onClick={startTimed} className="card-btn rounded-xl px-8 py-3 text-lg font-bold"
            style={{ background: 'var(--gold)', color: '#0a0e1a' }}>
            Başla
          </button>
        </div>
      )}

      {/* Zamana Karşı: sonuç */}
      {timed && timedOver && (
        <div className="flex flex-col items-center gap-4 pt-10 text-center">
          <div className="text-5xl">🏁</div>
          <h2 className="text-2xl font-bold">{score} doğru!</h2>
          {wasRecord && (
            <p className="font-semibold" style={{ color: 'var(--gold)' }}>🏆 Yeni rekor!</p>
          )}
          <p className="text-sm" style={{ color: 'var(--text-dim)' }}>En iyi: {getBestScore(sub, diff)}</p>
          <div className="flex gap-3">
            <button onClick={startTimed} className="card-btn rounded-xl px-6 py-3 font-bold"
              style={{ background: 'var(--gold)', color: '#0a0e1a' }}>
              Tekrar
            </button>
            <button onClick={share} className="card-btn rounded-xl border px-6 py-3 font-bold"
              style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
              {copied ? '✓ Kopyalandı' : 'Paylaş'}
            </button>
          </div>
        </div>
      )}

      {/* Oyun alanı */}
      {puzzle && !timedOver && (
        <>
          {/* Skor: küçük etiket + büyük rakam (Wordi referansı) */}
          {timed && (
            <div className="flex flex-col items-center leading-none">
              <span className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>skor</span>
              <span className="text-3xl font-extrabold" style={{ color: 'var(--gold-bright)' }}>{score}</span>
            </div>
          )}

          {sub !== 'classic' && (
            <PuzzleView puzzle={puzzle} wrongCount={guesses.length} revealed={won} rules={rules} hideSlot={awaitingSlot} />
          )}

          {/* Yetenek bonusu: şampiyon bilindi, sıra tuşta */}
          {awaitingSlot && (
            <div className="anim-pop flex w-full flex-col items-center gap-2 rounded-xl border p-4"
              style={{ borderColor: 'var(--gold)', background: 'var(--bg-card)' }}>
              <span className="font-semibold" style={{ color: 'var(--gold)' }}>
                🎉 {puzzle.champion.name}! Peki bu hangi tuş?
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                {SLOT_LABELS.map((label, i) => (
                  <button key={label} onClick={() => handleSlot(i)}
                    className="card-btn min-w-14 rounded-lg border px-4 py-2.5 font-bold"
                    style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
                    {label}
                  </button>
                ))}
              </div>
              {timed && <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Doğru tuş +1 puan</span>}
            </div>
          )}
          {sub === 'classic' && !won && guesses.length === 0 && (
            <p className="pt-2 text-center" style={{ color: 'var(--text-dim)' }}>
              Bir şampiyon tahmin et — her tahminde hangi özelliklerin tuttuğunu göreceksin.
            </p>
          )}

          {/* Kazanma bandı */}
          {won && !awaitingSlot && (
            <div className="anim-pop flex w-full flex-col items-center gap-3 rounded-xl border p-4 text-center"
              style={{ borderColor: 'var(--correct)', background: 'var(--bg-card)' }}>
              <span className="text-lg font-bold" style={{ color: 'var(--correct)' }}>
                🎉 Doğru: {answerLabel(puzzle)} — {guesses.length} denemede
              </span>
              {slotOk !== undefined && (
                <span className="text-sm font-semibold" style={{ color: slotOk ? 'var(--correct)' : 'var(--wrong)' }}>
                  {slotOk
                    ? `Tuş de doğru: ${SLOT_LABELS[puzzle.spellIndex ?? 0]}${timed ? ' (+1)' : ''}`
                    : `Tuş yanlış — doğrusu ${SLOT_LABELS[puzzle.spellIndex ?? 0]}`}
                </span>
              )}
              <div className="flex gap-3">
                {!daily && (
                  <button onClick={nextRound} className="card-btn rounded-xl px-6 py-2.5 font-bold"
                    style={{ background: 'var(--gold)', color: '#0a0e1a' }}>
                    Sonraki →
                  </button>
                )}
                {daily && (
                  <button onClick={share} className="card-btn rounded-xl border px-6 py-2.5 font-bold"
                    style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
                    {copied ? '✓ Kopyalandı' : 'Paylaş'}
                  </button>
                )}
              </div>
              {daily && <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Yarın yeni bulmaca seni bekliyor.</p>}
            </div>
          )}

          {/* Tahmin girişi */}
          {!won && (
            <div className={`flex w-full items-start gap-2 ${shaking ? 'anim-shake' : ''}`}
              onAnimationEnd={() => setShaking(false)}>
              <Autocomplete
                options={options}
                placeholder={sub === 'skin' ? 'Kostüm adı yaz...' : 'Şampiyon adı yaz...'}
                disabledKeys={guessedSet}
                onPick={handleGuess}
                autoFocus
              />
              {timed && (
                <button onClick={() => { setGuesses([]); setPuzzle(nextPuzzle(top, sub)) }}
                  className="card-btn shrink-0 rounded-lg border px-4 py-3 text-sm font-semibold"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
                  Pas
                </button>
              )}
            </div>
          )}

          {/* Classic tablo */}
          {sub === 'classic' && <ClassicBoard rows={rows} yearArrow={rules.yearArrow} />}

          {/* Diğer modlarda yanlış tahmin listesi */}
          {sub !== 'classic' && guesses.length > 0 && (
            <div className="flex w-full flex-wrap justify-center gap-1.5">
              {[...guesses].reverse().map((g, i) => {
                const correct = isCorrect(puzzle, g)
                const label = sub === 'skin'
                  ? options.find((o) => o.key === g)?.label ?? g
                  : byId(g)?.name ?? g
                return (
                  <span key={`${g}-${i}`} className="anim-row rounded-md px-2.5 py-1 text-sm font-medium"
                    style={{ background: correct ? 'var(--correct)' : 'var(--wrong)', color: '#fff' }}>
                    {label}
                  </span>
                )
              })}
            </div>
          )}
        </>
      )}

      {howTo && <HowTo sub={sub} onClose={() => setHowTo(false)} />}
    </div>
  )
}
