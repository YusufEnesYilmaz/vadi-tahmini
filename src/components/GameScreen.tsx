import { useEffect, useMemo, useRef, useState } from 'react'
import { evaluateGuess, type ClassicRow } from '../game/classic'
import { byId, CHAMPIONS, squareUrl } from '../game/data'
import { nextPuzzle, type Puzzle } from '../game/puzzle'
import { copyToClipboard, shareDailyClassic, shareDailySimple, shareTimed } from '../game/share'
import { shareCard } from '../game/shareCard'
import { todayKey } from '../game/rng'
import { getBestCombo, getBestScore, getDailyState, recordCombo, recordGame, recordScore, recordTimedRun, saveDailyState, getStats } from '../game/stats'
import { rulesFor } from '../game/difficulty'
import { playCorrect, playLose, playWin, playWrong } from '../game/sfx'
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
  const [announce, setAnnounce] = useState('') // ekran okuyucuya duyurulacak sonuç
  const [imgResult, setImgResult] = useState('')
  // Yetenek modu bonusu: şampiyon bilindikten sonra "hangi tuş?" — null = henüz cevaplanmadı
  const [slotGuess, setSlotGuess] = useState<number | null>(() => (daily ? getDailyState(sub).slot ?? null : null))

  // Zamana Karşı
  const [timeLeft, setTimeLeft] = useState(TIMED_SECONDS)
  const [score, setScore] = useState(0)
  const [timedOver, setTimedOver] = useState(false)
  const [wasRecord, setWasRecord] = useState(false)
  // Pas'sız seri: Pas'a basınca sıfırlanır, tur boyunca en uzunu saklanır
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [comboRecord, setComboRecord] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recordedRef = useRef(false) // tur kaydı bir kez yazılsın

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

  // Zamana Karşı'da hak sınırı yok — orada baskıyı süre kuruyor
  const outOfGuesses = !timed && !won && guesses.length >= rules.maxGuesses
  const left = rules.maxGuesses - guesses.length
  const finished = won || outOfGuesses || timedOver

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

  // Zamana Karşı bitti → turu ve rekorları kaydet.
  // `recordedRef`: StrictMode geliştirmede efektleri iki kez çalıştırıyor,
  // guard olmadan her tur iki kez sayılırdı.
  useEffect(() => {
    if (!timedOver || recordedRef.current) return
    recordedRef.current = true
    recordTimedRun(sub, diff, score)
    setWasRecord(recordScore(sub, diff, score))
    setComboRecord(recordCombo(sub, diff, bestCombo))
  }, [timedOver, sub, diff, score, bestCombo])

  /**
   * Klavye kısayolları — masaüstünde fareye uzanmadan oynanabilsin.
   * Yazı alanına yazarken devreye girmemeli, o yüzden input odaktayken çıkılıyor.
   */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      if (e.ctrlKey || e.altKey || e.metaKey) return

      // Yetenek bonusu: 1-5 ya da doğrudan P/Q/W/E/R
      if (awaitingSlot) {
        const byDigit = '12345'.indexOf(e.key)
        const byLetter = ['p', 'q', 'w', 'e', 'r'].indexOf(e.key.toLowerCase())
        const idx = byDigit >= 0 ? byDigit : byLetter
        if (idx >= 0) { e.preventDefault(); handleSlot(idx) }
        return
      }
      if (typing) return

      // Tur bitti: Enter ile sonraki bulmaca (Günlük'te sonraki yok)
      if (e.key === 'Enter') {
        if (finished && !daily && !timed) { e.preventDefault(); nextRound() }
        else if (timed && (!puzzle || timedOver)) { e.preventDefault(); startTimed() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function handleGuess(key: string) {
    if (!puzzle || finished) return
    const newGuesses = [...guesses, key]
    setGuesses(newGuesses)

    const correct = isCorrect(puzzle, key)
    const guessName = options.find((o) => o.key === key)?.label ?? key
    if (!correct) {
      setShaking(true)
      playWrong()
    }

    if (timed) {
      if (correct) {
        playCorrect()
        setAnnounce(`Doğru: ${answerLabel(puzzle)}. Skor ${score + 1}.`)
        // Yetenek modunda tur bonus sorusuyla biter — skor ve seri orada işlenir
        if (bonusMode) { setWon(true); return }
        setScore((s) => s + 1)
        bumpCombo()
        setGuesses([])
        setPuzzle(nextPuzzle(top, sub))
      } else {
        setAnnounce(`${guessName} yanlış.`)
      }
      return
    }

    const ranOut = !correct && newGuesses.length >= rules.maxGuesses
    if (correct || ranOut) {
      if (correct) setWon(true)
      recordGame(top, sub, diff, correct, newGuesses.length)
    }

    // Ekran okuyucu için: sonuç ve kalan hak sesli okunur
    if (correct) {
      playWin()
      setAnnounce(`Doğru: ${answerLabel(puzzle)}. ${newGuesses.length} denemede bildin.`)
    } else if (ranOut) {
      playLose()
      setAnnounce(`Hakkın bitti. Cevap: ${answerLabel(puzzle)}.`)
    } else {
      setAnnounce(`${guessName} yanlış. ${rules.maxGuesses - newGuesses.length} hakkın kaldı.`)
    }
    if (daily) {
      saveDailyState(sub, {
        date: getDailyState(sub).date,
        guesses: newGuesses,
        done: correct || ranOut,
        won: correct,
      })
    }
  }

  /** Pas'sız seriyi bir artır ve tur rekorunu güncelle */
  function bumpCombo() {
    const next = combo + 1
    setCombo(next)
    if (next > bestCombo) setBestCombo(next)
  }

  /** Yetenek bonusu: tuş seçimi. Zamana Karşı'da doğru tuş +1 puan getirir. */
  function handleSlot(idx: number) {
    if (!puzzle || slotGuess !== null) return
    setSlotGuess(idx)
    if (timed) {
      setScore((s) => s + 1 + (idx === (puzzle.spellIndex ?? 0) ? 1 : 0))
      bumpCombo() // şampiyonu bildi; tuş bonusu seriyi bozmaz
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
    setCombo(0)
    setBestCombo(0)
    setComboRecord(false)
    recordedRef.current = false
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

  /** Aynı sonucu görsel kart olarak paylaş — emoji ızgarası cihazdan cihaza kayıyordu */
  async function shareAsImage() {
    const subtitle = `${topName} ${subName} · ${todayKey()}`
    const headline = timed
      ? `${TIMED_SECONDS} saniyede ${score} doğru!`
      : won
        ? `${guesses.length} denemede bildim!`
        : `Bilemedim — cevap ${answerLabel(puzzle!)}`

    const res = await shareCard(
      {
        title: 'Vadi Tahmini',
        subtitle,
        headline,
        grid: sub === 'classic' && !timed
          ? [...rows].reverse().map((r) => Object.values(r.cells))
          : undefined,
        lines: sub !== 'classic' && !timed
          ? [`${SUB_MODES.find((m) => m.id === sub)!.icon} ${subName}: ${guesses.length} tahmin`]
          : timed
            ? [`🔥 Pas'sız en uzun seri: ${bestCombo}`]
            : undefined,
        footer: 'Bil bakalım, şampiyon kim?',
      },
      `vadi-tahmini-${todayKey()}.png`,
    )
    setImgResult(res === 'shared' ? '✓ Paylaşıldı' : res === 'downloaded' ? '✓ Görsel indirildi' : 'Paylaşılamadı')
    setTimeout(() => setImgResult(''), 2500)
  }

  const topName = TOP_MODES.find((m) => m.id === top)!.name
  const subName = SUB_MODES.find((m) => m.id === sub)!.name
  const stats = getStats(top, sub, diff)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-3 pb-10">
      {/* Ekran okuyucu duyurusu — görsel olarak gizli, tahmin sonucunu sesli okur */}
      <div className="sr-only" role="status" aria-live="polite">{announce}</div>

      {/* Üst çubuk — altında ince altın ayraç (Wordle referansındaki gibi) */}
      <div className="flex w-full items-center justify-between gap-2 border-b pt-3 pb-2"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <button onClick={onExit} className="card-btn rounded-xl border px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            ← Menü
          </button>
          <button onClick={() => setHowTo(true)} aria-label="Nasıl oynanır"
            className="card-btn rounded-xl border px-2.5 py-1.5 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            ?
          </button>
        </div>
        <span className="min-w-0 truncate text-center text-sm font-semibold sm:text-base" style={{ color: 'var(--gold)' }}>
          {topName} · {subName}
          {!daily && (
            <span className="block text-xs font-normal" style={{ color: 'var(--text-dim)' }}>
              {DIFFICULTIES.find((d) => d.id === diff)!.name}
            </span>
          )}
        </span>
        {timed && puzzle && !timedOver ? (
          <span className={`rounded-xl px-3 py-1.5 font-mono text-lg font-bold ${timeLeft <= 10 ? 'anim-pulse' : ''}`}
            style={{ background: timeLeft <= 10 ? 'var(--danger)' : 'var(--bg-card)', color: '#fff' }}>
            {timeLeft}s
          </span>
        ) : (
          <span className="w-16 text-right text-sm" style={{ color: 'var(--text-dim)' }}>
            {timed ? '⏱' : finished ? `Seri: ${stats.currentStreak}` : (
              // Kalan hak: son 2'de kırmızıya döner
              <span style={{ color: left <= 2 ? 'var(--danger-text)' : 'var(--text-dim)' }}>
                {left} hak
              </span>
            )}
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
            Bilemediğini "Pas" ile geçebilirsin — ama Pas serini sıfırlar.
          </p>
          <p className="text-sm" style={{ color: 'var(--text-dim)' }}>En iyi skorun: <b style={{ color: 'var(--gold)' }}>{getBestScore(sub, diff)}</b></p>
          <button onClick={startTimed} className="card-btn rounded-xl px-8 py-3 text-lg font-bold"
            style={{ background: 'var(--gold)', color: 'var(--on-gold)' }}>
            Başla
          </button>
        </div>
      )}

      {/* Zamana Karşı: sonuç */}
      {timed && timedOver && (
        <div className="flex flex-col items-center gap-4 pt-10 text-center">
          <div className="text-5xl">🏁</div>
          <h2 className="font-display text-2xl font-bold">{score} doğru!</h2>
          {wasRecord && (
            <p className="font-semibold" style={{ color: 'var(--gold)' }}>🏆 Yeni rekor!</p>
          )}
          <p className="text-sm" style={{ color: 'var(--text-dim)' }}>En iyi: {getBestScore(sub, diff)}</p>
          <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
            Pas'sız en uzun seri: <b style={{ color: 'var(--gold)' }}>🔥 {bestCombo}</b>
            {comboRecord && <span style={{ color: 'var(--gold)' }}> · yeni seri rekoru!</span>}
            <br />
            <span className="text-xs">Seri rekorun: {getBestCombo(sub, diff)}</span>
          </p>
          <div className="flex gap-3">
            <button onClick={startTimed} className="card-btn rounded-xl px-6 py-3 font-bold"
              style={{ background: 'var(--gold)', color: 'var(--on-gold)' }}>
              Tekrar
            </button>
            <button onClick={share} className="card-btn rounded-xl border px-5 py-3 font-bold"
              style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
              {copied ? '✓ Kopyalandı' : 'Metin'}
            </button>
            <button onClick={shareAsImage} className="card-btn rounded-xl border px-5 py-3 font-bold"
              style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
              {imgResult || '🖼 Görsel'}
            </button>
          </div>
        </div>
      )}

      {/* Oyun alanı */}
      {puzzle && !timedOver && (
        <>
          {/* Skor: küçük etiket + büyük rakam (Wordi referansı) */}
          {timed && (
            <div className="flex items-end gap-4">
              <div className="flex flex-col items-center leading-none">
                <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>skor</span>
                <span className="font-display text-3xl font-extrabold" style={{ color: 'var(--gold-bright)' }}>{score}</span>
              </div>
              <div className="flex flex-col items-center leading-none">
                <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>seri</span>
                <span className="font-display text-2xl font-extrabold" style={{ color: combo > 0 ? 'var(--gold)' : 'var(--text-dim)' }}>
                  {combo > 0 && '🔥'}{combo}
                </span>
              </div>
            </div>
          )}

          {sub !== 'classic' && (
            <PuzzleView puzzle={puzzle} wrongCount={guesses.length} revealed={won || outOfGuesses} rules={rules} hideSlot={awaitingSlot} />
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
                    className="card-btn min-w-14 rounded-xl border px-4 py-2.5 font-bold"
                    style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}
                    title={`Kısayol: ${i + 1}`}>
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                {timed ? 'Doğru tuş +1 puan · ' : ''}Klavye: 1-5 ya da P/Q/W/E/R
              </span>
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
              <span className="font-display text-lg font-bold" style={{ color: 'var(--correct)' }}>
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
                    style={{ background: 'var(--gold)', color: 'var(--on-gold)' }}>
                    Sonraki →
                  </button>
                )}
                {daily && (
                  <>
                    <button onClick={share} className="card-btn rounded-xl border px-5 py-2.5 font-bold"
                      style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
                      {copied ? '✓ Kopyalandı' : 'Metin'}
                    </button>
                    <button onClick={shareAsImage} className="card-btn rounded-xl border px-5 py-2.5 font-bold"
                      style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
                      {imgResult || '🖼 Görsel'}
                    </button>
                  </>
                )}
              </div>
              {daily && <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Yarın yeni bulmaca seni bekliyor.</p>}
            </div>
          )}

          {/* Kaybetme bandı — hak bitti, cevap açıklanır */}
          {outOfGuesses && (
            <div className="anim-pop flex w-full flex-col items-center gap-3 rounded-xl border p-4 text-center"
              style={{ borderColor: 'var(--danger)', background: 'var(--bg-card)' }}>
              <span className="font-display text-lg font-bold" style={{ color: 'var(--danger-text)' }}>
                😔 Hakkın bitti — cevap: {answerLabel(puzzle)}
              </span>
              {bonusMode && (
                <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                  Tuş: <b style={{ color: 'var(--gold)' }}>{SLOT_LABELS[puzzle.spellIndex ?? 0]}</b>
                </span>
              )}
              <div className="flex gap-3">
                {!daily && (
                  <button onClick={nextRound} className="card-btn rounded-xl px-6 py-2.5 font-bold"
                    style={{ background: 'var(--gold)', color: 'var(--on-gold)' }}>
                    Sonraki →
                  </button>
                )}
                {daily && (
                  <>
                    <button onClick={share} className="card-btn rounded-xl border px-5 py-2.5 font-bold"
                      style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
                      {copied ? '✓ Kopyalandı' : 'Metin'}
                    </button>
                    <button onClick={shareAsImage} className="card-btn rounded-xl border px-5 py-2.5 font-bold"
                      style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
                      {imgResult || '🖼 Görsel'}
                    </button>
                  </>
                )}
              </div>
              {daily && <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Yarın yeni bulmaca seni bekliyor.</p>}
            </div>
          )}

          {/* Tahmin girişi */}
          {!finished && (
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
                <button onClick={() => { setCombo(0); setGuesses([]); setPuzzle(nextPuzzle(top, sub)) }}
                  className="card-btn shrink-0 rounded-xl border px-4 py-3 text-sm font-semibold"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
                  title="Seriyi sıfırlar">
                  Pas
                </button>
              )}
            </div>
          )}

          {/* Classic tablo */}
          {sub === 'classic' && <ClassicBoard rows={rows} yearArrow={rules.yearArrow} />}

          {/* Diğer modlarda yanlış tahmin listesi */}
          {sub !== 'classic' && guesses.length > 0 && (
            <div className="flex w-full flex-wrap justify-center gap-2">
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
