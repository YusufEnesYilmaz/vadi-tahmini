import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { evaluateGuess, type ClassicRow } from '../game/classic'
import { byId, CHAMPIONS, ITEMS, itemIconUrl, splashUrl, squareUrl } from '../game/data'
import { createTimedStream, nextPuzzle, type Puzzle, type PuzzleStream } from '../game/puzzle'
import { copyToClipboard, shareDailyClassic, shareDailySimple, shareTimed } from '../game/share'
import { shareCard } from '../game/shareCard'
import { challengeUrl, getNick, recordChallengeWin, setNick, type Challenge } from '../game/challenge'
import { filterKey, filterLabel, type PoolFilter } from '../game/filter'
import { cryptoRandInt, todayKey } from '../game/rng'
import { getBestCombo, getBestScore, getDailyState, recordCombo, recordGame, recordScore, recordTimedRun, saveDailyState, getStats } from '../game/stats'
import { rulesFor } from '../game/difficulty'
import { playCorrect, playLose, playWin, playWrong, playAchievement } from '../game/sfx'
import { evaluateAchievements, recordChampWin, type EarnedAchievement } from '../game/achievements'
import { DIFFICULTIES, SUB_MODES, TOP_MODES, subMeta, type Difficulty, type PlaySub, type SubMode, type TopMode } from '../game/types'
import Autocomplete, { type AcOption } from './Autocomplete'
import ClassicBoard from './ClassicBoard'
import HowTo from './HowTo'
import PuzzleView from './PuzzleView'

interface Props {
  top: TopMode
  sub: PlaySub
  diff: Difficulty
  filter: PoolFilter // havuz daraltması (Günlük'te yok sayılır)
  challenge?: Challenge // link'le açıldıysa: aynı seed + rakip skoru
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

function itemOptions(): AcOption[] {
  return ITEMS.map((i) => ({ key: i.id, label: i.name, img: itemIconUrl(i.img) }))
}

function isCorrect(puzzle: Puzzle, guessKey: string): boolean {
  if (puzzle.sub === 'item') return guessKey === puzzle.item.id
  if (puzzle.sub === 'skin') return guessKey === `${puzzle.champion.id}:${puzzle.skin?.num}`
  return guessKey === puzzle.champion.id
}

function answerLabel(puzzle: Puzzle): string {
  if (puzzle.sub === 'item') return puzzle.item.name
  return puzzle.sub === 'skin' ? `${puzzle.skin?.name}` : puzzle.champion.name
}

export default function GameScreen({ top, sub, diff, filter, challenge, onExit }: Props) {
  const daily = top === 'daily'
  const timed = top === 'timed'
  const rules = rulesFor(top, diff)
  const TIMED_SECONDS = rules.timedSeconds
  // Günlük fonksiyonları gerçek SubMode ister; menü Günlük'te 'mix' sunmadığı için
  // daily ⟹ sub gerçek tip. 'classic' yalnız tip güvenliği için yer tutucu (daily'de asla tetiklenmez).
  const dailySub: SubMode = sub === 'mix' ? 'classic' : sub

  const [puzzle, setPuzzle] = useState<Puzzle | null>(() => (timed ? null : nextPuzzle(top, sub, filter)))
  const [guesses, setGuesses] = useState<string[]>(() => (daily ? getDailyState(dailySub).guesses : []))
  const [won, setWon] = useState<boolean>(() => (daily ? getDailyState(dailySub).won : false))
  const [copied, setCopied] = useState(false)
  const [shaking, setShaking] = useState(false) // yanlış tahminde giriş alanı titrer
  const [howTo, setHowTo] = useState(false)
  const [announce, setAnnounce] = useState('') // ekran okuyucuya duyurulacak sonuç
  const [imgResult, setImgResult] = useState('')
  // Yetenek modu bonusu: şampiyon bilindikten sonra "hangi tuş?" — null = henüz cevaplanmadı
  const [slotGuess, setSlotGuess] = useState<number | null>(() => (daily ? getDailyState(dailySub).slot ?? null : null))

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
  // Tur bitiş anı: sonuç kartı kazara Enter ile atlanmasın (aşağıdaki kısayola bak)
  const finishedAtRef = useRef(0)
  // Zamana Karşı seed'li akış: tur boyunca sabit dizi (meydan okuma bunun üstüne kurulu)
  const streamRef = useRef<PuzzleStream | null>(null)
  // Meydan okuma paylaşımı
  const [chLink, setChLink] = useState('') // "kopyalandı/paylaşıldı" geri bildirimi
  const [nick, setNickState] = useState(getNick)
  const [askNick, setAskNick] = useState(false)
  const [chSeed, setChSeed] = useState(0) // bu turun seed'i (paylaşım için)
  const [chResultWin, setChResultWin] = useState<boolean | null>(null) // meydan okuma sonucu

  // Rozet toast kuyruğu
  const [achToasts, setAchToasts] = useState<EarnedAchievement[]>([])
  const achTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Rozetleri kontrol et, yeni kazanılanları toast kuyruğuna ekle */
  const checkAchievements = useCallback(() => {
    const newOnes = evaluateAchievements()
    if (newOnes.length > 0) {
      playAchievement()
      setAchToasts((prev) => [...prev, ...newOnes])
    }
  }, [])

  // Toast kuyruğu: her 2.5 sn'de birini sil (kuyruklu gösterim)
  useEffect(() => {
    if (achToasts.length === 0) return
    achTimerRef.current = setTimeout(() => {
      setAchToasts((prev) => prev.slice(1))
    }, 2500)
    return () => { if (achTimerRef.current) clearTimeout(achTimerRef.current) }
  }, [achToasts])

  /** Zamana Karşı seed'li akıştan, diğer modlar desteden çeker */
  function drawNext(): Puzzle {
    if (timed && streamRef.current) return streamRef.current.next()
    return nextPuzzle(top, sub, filter)
  }

  // Karışıkta gerçek soru tipi puzzle'dan gelir; puzzle henüz yoksa (Zamana Karşı
  // başlangıç ekranı) yer tutucu. sub 'mix' değilse zaten gerçek tiptir.
  const activeSub: SubMode = puzzle?.sub ?? (sub === 'mix' ? 'classic' : sub)
  const isMix = sub === 'mix'

  // Eşya modunda tahmin listesi eşyalardan, Kostüm'de kostümlerden, diğerlerinde şampiyonlardan
  const options = useMemo(
    () => (activeSub === 'item' ? itemOptions() : activeSub === 'skin' ? skinOptions() : championOptions()),
    [activeSub],
  )
  const guessedSet = useMemo(() => new Set(guesses), [guesses])

  const rows: ClassicRow[] = useMemo(() => {
    if (activeSub !== 'classic' || puzzle?.sub !== 'classic') return []
    return guesses
      .map((id) => byId(id))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => evaluateGuess(c, puzzle.champion, rules.showPartial))
      .reverse() // en yeni üstte
  }, [guesses, puzzle, activeSub, rules.showPartial])

  // Zamana Karşı'da hak sınırı yok — orada baskıyı süre kuruyor
  const outOfGuesses = !timed && !won && guesses.length >= rules.maxGuesses
  const left = rules.maxGuesses - guesses.length
  const finished = won || outOfGuesses || timedOver

  const bonusMode = activeSub === 'ability'
  const awaitingSlot = bonusMode && won && slotGuess === null // tur bitmedi: tuş bekleniyor
  const spellIndex = puzzle?.sub === 'ability' ? puzzle.spellIndex ?? 0 : 0
  const slotOk = bonusMode && puzzle && slotGuess !== null ? slotGuess === spellIndex : undefined

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
    // Süre tuş sorusu beklerken bittiyse şampiyon zaten bilinmişti — +1'i yakmadan işle
    // (tuş bonusu kaçtı ama seri kuralı gereği şampiyonu bilmek seriyi de sayar)
    const pending = awaitingSlot ? 1 : 0
    const finalScore = score + pending
    const finalBestCombo = Math.max(bestCombo, combo + pending)
    if (pending) {
      setScore(finalScore)
      setBestCombo(finalBestCombo)
    }
    recordTimedRun(sub, diff, finalScore)
    setWasRecord(recordScore(sub, diff, finalScore))
    setComboRecord(recordCombo(sub, diff, finalBestCombo))
    // Meydan okuma: rakibi geçtiysen kazandın (beraberlik kayıp sayılmaz, ama "kazandın" da denmez)
    if (challenge) {
      const win = finalScore > challenge.score
      setChResultWin(win)
      if (win) recordChallengeWin()
    }
    // Rozetleri kontrol et (kayıtlardan sonra)
    setTimeout(checkAchievements, 50)
  }, [timedOver, sub, diff, score, bestCombo, combo, awaitingSlot, challenge, checkAchievements])

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

      // Tur bitti: Enter ile sonraki bulmaca (Günlük'te sonraki yok).
      // İki koruma: (1) `e.repeat` — tahmini seçmek için Enter'a basılı tutulunca
      // klavye tekrarı sonuç kartını anında atlıyordu; (2) 800 ms bekleme —
      // alışkanlıkla atılan ikinci Enter cevabı görmeden geçirmesin.
      if (e.key === 'Enter') {
        if (e.repeat) return
        if (finished && Date.now() - finishedAtRef.current < 800) return
        if (finished && !daily && !timed) { e.preventDefault(); nextRound() }
        else if (timed && (!puzzle || timedOver)) { e.preventDefault(); startTimed() }
        // Zamana Karşı + Yetenek: tuş bonusu cevaplandıysa Enter süre kaybettirmeden ilerletir
        else if (timed && puzzle && !timedOver && won && !awaitingSlot) { e.preventDefault(); nextRound() }
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
        // Koleksiyon rozetleri şampiyon sayar — Eşya modunda şampiyon yok
        if (puzzle.sub !== 'item') recordChampWin(puzzle.champion.id)
        setAnnounce(`Doğru: ${answerLabel(puzzle)}. Skor ${score + 1}.`)
        // Yetenek modunda tur bonus sorusuyla biter — skor ve seri orada işlenir
        if (bonusMode) { setWon(true); return }
        setScore((s) => s + 1)
        bumpCombo()
        setGuesses([])
        setPuzzle(drawNext())
      } else {
        setAnnounce(`${guessName} yanlış.`)
      }
      return
    }

    const ranOut = !correct && newGuesses.length >= rules.maxGuesses
    if (correct || ranOut) {
      finishedAtRef.current = Date.now() // sonuç kartı Enter ile hemen atlanmasın
      if (correct) {
        setWon(true)
        if (puzzle.sub !== 'item') recordChampWin(puzzle.champion.id)
      }
      recordGame(top, sub, diff, correct, newGuesses.length)
      // Kayıttan sonra rozetleri kontrol et
      setTimeout(checkAchievements, 50)
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
      saveDailyState(dailySub, {
        date: getDailyState(dailySub).date,
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
    finishedAtRef.current = Date.now() // tuş cevabından sonra açılan kart da atlanmasın
    setSlotGuess(idx)
    if (timed) {
      setScore((s) => s + 1 + (idx === spellIndex ? 1 : 0))
      bumpCombo() // şampiyonu bildi; tuş bonusu seriyi bozmaz
    } else if (daily) {
      saveDailyState(dailySub, { ...getDailyState(dailySub), slot: idx })
    }
  }

  function nextRound() {
    setGuesses([])
    setWon(false)
    setCopied(false)
    setSlotGuess(null)
    setPuzzle(drawNext())
  }

  function startTimed() {
    // Meydan okuma linkiyle açıldıysa aynı seed → birebir aynı sorular; yoksa rastgele
    const seed = challenge ? challenge.seed : cryptoRandInt(0x100000000)
    setChSeed(seed)
    streamRef.current = createTimedStream(seed, sub, filter)
    setChResultWin(null)
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
    setPuzzle(streamRef.current.next())
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

  /** Meydan okuma linki üret + paylaş. Takma ad yoksa önce onu sorar. */
  async function challengeShare() {
    const currentNick = getNick()
    if (!currentNick) { setAskNick(true); return }
    const c: Challenge = { seed: chSeed, sub, diff, score, combo: bestCombo, nick: currentNick, filter: filterKey(filter) }
    const text = `Vadi Tahmini — sana meydan okuyorum! 👊 ${TIMED_SECONDS} sn'de ${score} yaptım, geçebilir misin?\n${challengeUrl(c)}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Vadi Tahmini', text })
        setChLink('✓ Paylaşıldı')
      } catch { return } // kullanıcı vazgeçti
    } else {
      setChLink((await copyToClipboard(text)) ? '✓ Link kopyalandı' : 'Kopyalanamadı')
    }
    setTimeout(() => setChLink(''), 2500)
  }

  function saveNickAndShare() {
    const n = nick.trim() || 'Rakip'
    setNick(n)
    setNickState(n)
    setAskNick(false)
    // Takma ad artık localStorage'da; challengeShare onu okuyup linki üretir
    void challengeShare()
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
        grid: activeSub === 'classic' && !timed
          ? [...rows].reverse().map((r) => Object.values(r.cells))
          : undefined,
        lines: activeSub !== 'classic' && !timed
          ? [`${activeMeta.icon} ${subName}: ${guesses.length} tahmin`]
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
  const subName = subMeta(sub).name // mix dahil
  const activeMeta = SUB_MODES.find((m) => m.id === activeSub)! // o anki gerçek tip (rozet için)
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
          {/* Karışıkta o anki gerçek soru tipini göster */}
          {isMix && puzzle && !timedOver && (
            <span className="block text-xs font-normal" style={{ color: 'var(--gold-bright)' }}>
              🎲 {activeMeta.icon} {activeMeta.name}
            </span>
          )}
          {!daily && !isMix && (
            <span className="block text-xs font-normal" style={{ color: 'var(--text-dim)' }}>
              {DIFFICULTIES.find((d) => d.id === diff)!.name}
            </span>
          )}
          {/* Havuz daraltılmışsa göster — oyuncu neden hep aynı bölgeden geldiğini bilsin */}
          {!daily && filter.kind !== 'all' && (
            <span className="block text-xs font-normal" style={{ color: 'var(--gold)' }}>
              🎯 {filterLabel(filter)}
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
          {challenge ? (
            <>
              <div className="text-5xl">⚔️</div>
              <h2 className="font-display text-xl font-bold">
                <b style={{ color: 'var(--gold-bright)' }}>{challenge.nick}</b> sana meydan okuyor!
              </h2>
              <div className="rounded-xl border p-4" style={{ borderColor: 'var(--gold)', background: 'var(--bg-card)' }}>
                <p style={{ color: 'var(--text-dim)' }}>Geçmen gereken skor:</p>
                <p className="font-display text-4xl font-extrabold" style={{ color: 'var(--gold)' }}>{challenge.score}</p>
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                  {subName} · {DIFFICULTIES.find((d) => d.id === diff)!.name} · {TIMED_SECONDS} sn
                  {challenge.combo > 0 && <> · seri 🔥{challenge.combo}</>}
                </p>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Aynı sorular sana da gelecek — hazırsan başla.</p>
            </>
          ) : (
            <>
              <div className="text-5xl">⏱</div>
              <h2 className="text-xl font-bold">Zamana Karşı — {subName}</h2>
              <p style={{ color: 'var(--text-dim)' }}>
                {TIMED_SECONDS} saniyede kaç tane bilebilirsin?<br />
                Bilemediğini "Pas" ile geçebilirsin — ama Pas serini sıfırlar.
              </p>
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>En iyi skorun: <b style={{ color: 'var(--gold)' }}>{getBestScore(sub, diff)}</b></p>
            </>
          )}
          <button onClick={startTimed} className="card-btn rounded-xl px-8 py-3 text-lg font-bold"
            style={{ background: 'var(--gold)', color: 'var(--on-gold)' }}>
            Başla
          </button>
        </div>
      )}

      {/* Zamana Karşı: sonuç */}
      {timed && timedOver && (
        <div className="flex flex-col items-center gap-4 pt-10 text-center">
          {/* Meydan okuma sonucu: rakiple karşılaştırma bandı */}
          {challenge && chResultWin !== null && (
            <div className="anim-pop w-full rounded-xl border p-4"
              style={{
                borderColor: chResultWin ? 'var(--correct)' : score === challenge.score ? 'var(--gold)' : 'var(--danger)',
                background: 'var(--bg-card)',
              }}>
              <p className="font-display text-xl font-bold"
                style={{ color: chResultWin ? 'var(--correct)' : score === challenge.score ? 'var(--gold)' : 'var(--danger-text)' }}>
                {chResultWin ? '🏆 Kazandın!' : score === challenge.score ? '🤝 Berabere!' : '😔 Kaybettin'}
              </p>
              <div className="mt-2 flex items-center justify-center gap-6">
                <div>
                  <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>sen</div>
                  <div className="font-display text-3xl font-extrabold" style={{ color: 'var(--gold-bright)' }}>{score}</div>
                </div>
                <span style={{ color: 'var(--text-dim)' }}>vs</span>
                <div>
                  <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{challenge.nick}</div>
                  <div className="font-display text-3xl font-extrabold" style={{ color: 'var(--text-dim)' }}>{challenge.score}</div>
                </div>
              </div>
            </div>
          )}
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
          <div className="flex flex-wrap justify-center gap-3">
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

          {/* Meydan oku: aynı seed'i link olarak paylaş */}
          {askNick ? (
            <div className="anim-pop flex w-full max-w-sm flex-col gap-2 rounded-xl border p-3"
              style={{ borderColor: 'var(--gold)', background: 'var(--bg-card)' }}>
              <label className="text-sm" style={{ color: 'var(--text-dim)' }}>Takma adın (linkte görünecek):</label>
              <div className="flex gap-2">
                <input value={nick} onChange={(e) => setNickState(e.target.value)} maxLength={20}
                  onKeyDown={(e) => e.key === 'Enter' && saveNickAndShare()}
                  placeholder="Örn: Ahmet" autoFocus
                  className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                <button onClick={saveNickAndShare} className="card-btn shrink-0 rounded-lg px-4 py-2 text-sm font-bold"
                  style={{ background: 'var(--gold)', color: 'var(--on-gold)' }}>
                  Paylaş
                </button>
              </div>
            </div>
          ) : (
            <button onClick={challengeShare} className="card-btn rounded-xl border px-6 py-3 font-bold"
              style={{ borderColor: 'var(--gold)', color: 'var(--gold-bright)' }}>
              {chLink || '⚔ Meydan oku'}
            </button>
          )}
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

          {activeSub !== 'classic' && (
            <PuzzleView puzzle={puzzle} wrongCount={guesses.length} revealed={won || outOfGuesses} rules={rules} hideSlot={awaitingSlot} />
          )}

          {/* Yetenek bonusu: şampiyon bilindi, sıra tuşta */}
          {awaitingSlot && (
            <div className="anim-pop flex w-full flex-col items-center gap-2 rounded-xl border p-4"
              style={{ borderColor: 'var(--gold)', background: 'var(--bg-card)' }}>
              <span className="font-semibold" style={{ color: 'var(--gold)' }}>
                🎉 {answerLabel(puzzle)}! Peki bu hangi tuş?
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
          {activeSub === 'classic' && !won && guesses.length === 0 && (
            <p className="pt-2 text-center" style={{ color: 'var(--text-dim)' }}>
              Bir şampiyon tahmin et — her tahminde hangi özelliklerin tuttuğunu göreceksin.
            </p>
          )}

          {/* Tur sonu kartı — kazandın da kaybettin de aynı kart: durum + şampiyon görseli + Sonraki */}
          {(won || outOfGuesses) && !awaitingSlot && (
            <div className="anim-pop flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border p-4 text-center"
              style={{ borderColor: won ? 'var(--correct)' : 'var(--danger)', background: 'var(--bg-card)' }}>
              <span className="font-display text-xl font-bold"
                style={{ color: won ? 'var(--correct)' : 'var(--danger-text)' }}>
                {won ? '🎉 Bildin!' : '😔 Bulamadın'}
              </span>

              {/* Cevabın kendisi: görsel + ad. Kostüm/Görsel modunda sorunun görseli gösterilir */}
              {puzzle.sub === 'item' ? (
                <img
                  src={itemIconUrl(puzzle.item.img)}
                  alt={puzzle.item.name}
                  className="h-24 w-24 rounded-lg border"
                  style={{ borderColor: 'var(--gold)' }}
                />
              ) : (
                <img
                  src={splashUrl(puzzle.champion.id, puzzle.skin?.num ?? puzzle.splashNum ?? 0)}
                  alt={puzzle.champion.name}
                  className="aspect-video w-full rounded-lg border object-cover"
                  style={{ borderColor: 'var(--border)' }}
                />
              )}
              <div>
                <div className="font-display text-lg font-bold" style={{ color: 'var(--gold-bright)' }}>
                  {answerLabel(puzzle)}
                </div>
                {/* Kostüm modunda cevap kostümün adı — şampiyonu da yaz */}
                {puzzle.sub === 'skin' && (
                  <div className="text-sm" style={{ color: 'var(--text-dim)' }}>{puzzle.champion.name}</div>
                )}
                {/* Eşya modunda altın değeri kapanışta görünsün */}
                {puzzle.sub === 'item' && (
                  <div className="text-sm" style={{ color: 'var(--text-dim)' }}>🪙 {puzzle.item.gold} altın</div>
                )}
                <div className="text-sm" style={{ color: 'var(--text-dim)' }}>
                  {won ? `${guesses.length} denemede bildin` : `${guesses.length} tahmin hakkın da bitti`}
                </div>
              </div>

              {/* Yetenek modu: tuş bonusunun sonucu */}
              {slotOk !== undefined && (
                <span className="text-sm font-semibold" style={{ color: slotOk ? 'var(--correct)' : 'var(--danger-text)' }}>
                  {slotOk
                    ? `Tuş de doğru: ${SLOT_LABELS[spellIndex]}${timed ? ' (+1)' : ''}`
                    : `Tuş yanlış — doğrusu ${SLOT_LABELS[spellIndex]}`}
                </span>
              )}
              {outOfGuesses && bonusMode && (
                <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                  Tuş: <b style={{ color: 'var(--gold)' }}>{SLOT_LABELS[spellIndex]}</b>
                </span>
              )}

              <div className="flex flex-wrap justify-center gap-3">
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
                placeholder={activeSub === 'skin' ? 'Kostüm veya şampiyon adı yaz...' : 'Şampiyon adı yaz...'}
                disabledKeys={guessedSet}
                onPick={handleGuess}
                autoFocus
                maxResults={activeSub === 'skin' ? 20 : 8}
              />
              {timed && (
                <button onClick={() => { setCombo(0); setGuesses([]); setPuzzle(drawNext()) }}
                  className="card-btn shrink-0 rounded-xl border px-4 py-3 text-sm font-semibold"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
                  title="Seriyi sıfırlar">
                  Pas
                </button>
              )}
            </div>
          )}

          {/* Classic tablo */}
          {activeSub === 'classic' && <ClassicBoard rows={rows} yearArrow={rules.yearArrow} />}

          {/* Diğer modlarda yanlış tahmin listesi */}
          {activeSub !== 'classic' && guesses.length > 0 && (
            <div className="flex w-full flex-wrap justify-center gap-2">
              {[...guesses].reverse().map((g, i) => {
                const correct = isCorrect(puzzle, g)
                const label = activeSub === 'skin'
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

      {howTo && <HowTo sub={activeSub} onClose={() => setHowTo(false)} />}

      {/* Rozet toast kuyruğu — sağ üstte sabit */}
      {achToasts.length > 0 && (
        <div className="fixed right-3 top-3 z-[60] flex flex-col gap-2" style={{ maxWidth: 280 }}>
          {achToasts.map((ea, i) => (
            <div key={`${ea.ach.id}-${i}`}
              className="anim-pop flex items-center gap-2 rounded-xl border px-3 py-2 shadow-lg"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--gold)', color: 'var(--text)' }}>
              <span className="text-2xl">{ea.ach.icon}</span>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold" style={{ color: 'var(--gold-bright)' }}>{ea.ach.name}</div>
                <div className="truncate text-xs" style={{ color: 'var(--text-dim)' }}>{ea.ach.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
