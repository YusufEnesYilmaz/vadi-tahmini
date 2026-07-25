import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { evaluateGuess, type ClassicRow } from '../game/classic'
import { byId, CHAMPIONS, ITEMS, itemIconUrl, splashUrl, squareUrl } from '../game/data'
import { createTimedStream, nextPuzzle, type Puzzle, type PuzzleStream } from '../game/puzzle'
import { copyToClipboard, shareDailyClassic, shareDailySimple, shareTimed } from '../game/share'
import { shareCard } from '../game/shareCard'
import { getNick, setNick, getPlayerId } from '../game/challenge'
import type { PoolFilter } from '../game/filter'
import { cryptoRandInt, todayKey } from '../game/rng'
import { getBestCombo, getBestScore, getDailyState, recordCombo, recordGame, recordScore, recordTimedRun, saveDailyState, getStats } from '../game/stats'
import { getTimedSecondsLeft } from '../game/timed'
import { rulesFor } from '../game/difficulty'
import { godMode } from '../game/dev'
import { playCorrect, playLose, playWin, playWrong, playAchievement } from '../game/sfx'
import { evaluateAchievements, recordChampWin, type EarnedAchievement } from '../game/achievements'
import { DAILY_SUBS, LEADERBOARD_DIFFS, SUB_MODES, TOP_MODES, subMeta, type Difficulty, type PlaySub, type SubMode, type TopMode } from '../game/types'
import { isLeaderboardEnabled, submitDailyScore, submitTimedScore } from '../game/supabase'
import Autocomplete, { type AcOption } from './Autocomplete'
import ChampionInfo from './ChampionInfo'
import ClassicBoard from './ClassicBoard'
import HowTo from './HowTo'
import PuzzleView from './PuzzleView'
import WinConfetti from './game/WinConfetti'
import GameBackdrop from './game/GameBackdrop'
import GameHeader from './game/GameHeader'

interface Props {
  top: TopMode
  sub: PlaySub
  diff: Difficulty
  filter: PoolFilter // havuz daraltması (Günlük'te yok sayılır)
  onPlaySub: (sub: SubMode) => void // Günlük: sıradaki moda geç (menüye dönmeden)
  onExit: () => void
}

/** Yetenek bonusu: 0=Pasif, 1..4 = Q W E R (puzzle.spellIndex ile aynı sıra) */
const SLOT_LABELS = ['Pasif', 'Q', 'W', 'E', 'R']

/**
 * Silüet modunda portre GÖSTERİLMEZ: açılır listedeki küçük resim,
 * ekrandaki karartılmış görselle karşılaştırılıp cevabı ele veriyordu.
 */
function championOptions(withImages = true): AcOption[] {
  return CHAMPIONS.map((c) => ({ key: c.id, label: c.name, img: withImages ? squareUrl(c.id) : undefined }))
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


export default function GameScreen({ top, sub, diff, filter, onPlaySub, onExit }: Props) {
  const daily = top === 'daily'
  const timed = top === 'timed'
  const rules = rulesFor(top, diff)
  const TIMED_SECONDS = rules.timedSeconds
  // Günlük fonksiyonları gerçek SubMode ister; menü Günlük'te 'mix' sunmadığı için
  // daily ⟹ sub gerçek tip. 'classic' yalnız tip güvenliği için yer tutucu (daily'de asla tetiklenmez).
  const dailySub: SubMode = sub === 'mix' ? 'classic' : sub
  const sessionDate = useRef(todayKey()).current

  // God mode (yalnız yerel dev): günlükte kayıtlı durumu YÜKLEME → her giriş taze, sınırsız tekrar
  const loadDaily = daily && !godMode()

  const [puzzle, setPuzzle] = useState<Puzzle | null>(() => (timed ? null : nextPuzzle(top, sub, filter)))
  const [guesses, setGuesses] = useState<string[]>(() => (loadDaily ? getDailyState(dailySub).guesses : []))
  const [won, setWon] = useState<boolean>(() => (loadDaily ? getDailyState(dailySub).won : false))
  const [copied, setCopied] = useState(false)
  const [shaking, setShaking] = useState(false) // yanlış tahminde giriş alanı titrer
  const [howTo, setHowTo] = useState(false)
  const [info, setInfo] = useState(false) // tur sonu: şampiyon bilgi kartı
  const [announce, setAnnounce] = useState('') // ekran okuyucuya duyurulacak sonuç
  const [imgResult, setImgResult] = useState('')
  // Yetenek modu bonusu: şampiyon bilindikten sonra "hangi tuş?" — null = henüz cevaplanmadı
  const [slotGuess, setSlotGuess] = useState<number | null>(() => (loadDaily ? getDailyState(dailySub).slot ?? null : null))

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
  const timedStartedAtRef = useRef(0)
  const recordedRef = useRef(false) // tur kaydı bir kez yazılsın
  // Tur bitiş anı: sonuç kartı kazara Enter ile atlanmasın (aşağıdaki kısayola bak)
  const finishedAtRef = useRef(0)
  // Zamana Karşı seed'li akış: tur boyunca sabit dizi
  const streamRef = useRef<PuzzleStream | null>(null)
  // Sıralama takma adı: adsız oyuncunun skoru sessizce yazılamıyor — sonuçta sorulur
  const [nick, setNickState] = useState(getNick)
  const [needsNick, setNeedsNick] = useState(false) // skor sıralamaya yazılamadı: ad iste
  const [lbSaved, setLbSaved] = useState(false) // ad girildi, skor gönderildi geri bildirimi

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
    () => (activeSub === 'item' ? itemOptions() : activeSub === 'skin' ? skinOptions() : championOptions(activeSub !== 'silhouette')),
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

  const refreshTimedClock = useCallback((nowMs = Date.now()) => {
    if (!timedStartedAtRef.current) return
    const nextLeft = getTimedSecondsLeft(timedStartedAtRef.current, TIMED_SECONDS, nowMs)
    setTimeLeft(nextLeft)
    if (nextLeft === 0) {
      if (timerRef.current) clearInterval(timerRef.current)
      setTimedOver(true)
    }
  }, [TIMED_SECONDS])

  // Zamana Karşı sayacı
  useEffect(() => {
    if (!timed || !puzzle || timedOver) return
    refreshTimedClock()
    timerRef.current = setInterval(() => refreshTimedClock(Date.now()), 250)
    const onVisibilityChange = () => refreshTimedClock(Date.now())
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [timed, puzzle, timedOver, refreshTimedClock])

  // Zamana Karşı bitti → turu ve rekorları kaydet.
  // `recordedRef`: StrictMode geliştirmede efektleri iki kez çalıştırıyor,
  // guard olmadan her tur iki kez sayılırdı.
  useEffect(() => {
    if (!timedOver || recordedRef.current) return
    recordedRef.current = true

    // Puan ve kombo zaten şampiyon bilindiği an güncellendiği için pending'e gerek yok.
    const finalScore = score
    const finalBestCombo = Math.max(bestCombo, combo)

    recordTimedRun(sub, diff, finalScore)
    setWasRecord(recordScore(sub, diff, finalScore))
    setComboRecord(recordCombo(sub, diff, finalBestCombo))
    // Küresel Sıralamaya ekle. Takma ad yoksa gönderilemez — eskiden bu sessizce
    // atlanıyordu (adsız oyuncunun skoru sıralamaya HİÇ yazılmıyordu); artık sonuç
    // ekranında ad sorulur ve girilince skor geriye dönük gönderilir.
    if (finalScore > 0 && nick && nick.trim()) {
      void submitTimedScore(getPlayerId(), sub, diff, nick, finalScore)
    } else if (finalScore > 0 && isLeaderboardEnabled && LEADERBOARD_DIFFS.includes(diff)) {
      setNeedsNick(true)
    }
    // Rozetleri kontrol et (kayıtlardan sonra)
    setTimeout(checkAchievements, 50)
  }, [timedOver, sub, diff, score, bestCombo, combo, nick, checkAchievements])

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
        if (puzzle.sub !== 'item') recordChampWin(puzzle.champion.id, guesses.length === 0)
        setAnnounce(`Doğru: ${answerLabel(puzzle)}. Skor ${score + 1}.`)
        
        // Puanı ve komboyu şampiyon bilindiği an hemen artırıyoruz
        setScore((s) => s + 1)
        bumpCombo()

        // Yetenek modunda tuş bonusu sorusuna geç
        if (bonusMode) { setWon(true); return }
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
        if (puzzle.sub !== 'item') recordChampWin(puzzle.champion.id, newGuesses.length === 1)
        if (daily && nick && nick.trim()) {
          void submitDailyScore(getPlayerId(), sub, sessionDate, nick, newGuesses.length)
        } else if (daily && isLeaderboardEnabled) {
          setNeedsNick(true)
        }
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
        date: sessionDate,
        guesses: newGuesses,
        done: correct || ranOut,
        won: correct,
        answer: answerLabel(puzzle), // takvimde geçmiş günün cevabı görünsün
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
      if (idx === spellIndex) {
        setScore((s) => s + 1)
      }
    } else if (daily) {
      saveDailyState(dailySub, {
        date: sessionDate,
        guesses,
        done: won || outOfGuesses,
        won,
        slot: idx,
        answer: answerLabel(puzzle),
      })
    }
  }

  function nextRound() {
    setGuesses([])
    setWon(false)
    setCopied(false)
    setSlotGuess(null)
    setInfo(false) // açık kalırsa sonraki şampiyonun kartına dönüşürdü
    setPuzzle(drawNext())
  }

  function startTimed() {
    if (timerRef.current) clearInterval(timerRef.current)
    streamRef.current = createTimedStream(cryptoRandInt(0x100000000), sub, filter)
    timedStartedAtRef.current = Date.now()
    setNeedsNick(false)
    setLbSaved(false)
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
    if (timed) text = shareTimed(sub, score, wasRecord, TIMED_SECONDS)
    else if (sub === 'classic') text = shareDailyClassic([...rows].reverse(), won)
    else text = shareDailySimple(sub, guesses.length, won, slotOk)
    if (await copyToClipboard(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  /** Sonuç ekranındaki ad kutusu: takma adı kaydet + bu turun skorunu sıralamaya gönder */
  function saveNickAndSubmit() {
    const n = nick.trim()
    if (!n) return
    setNick(n)
    setNickState(getNick())
    setNeedsNick(false)
    setLbSaved(true)
    if (timed) {
      void submitTimedScore(getPlayerId(), sub, diff, n, score)
    } else if (daily && won) {
      void submitDailyScore(getPlayerId(), sub, sessionDate, n, guesses.length)
    }
  }

  function renderNickPrompt() {
    if (!needsNick) return null
    return (
      <div className="anim-pop flex w-full max-w-sm flex-col gap-2 rounded-xl border p-3"
        style={{ borderColor: 'var(--gold)', background: 'var(--bg-card)' }}>
        <label className="text-sm" style={{ color: 'var(--text-dim)' }}>
          Skorun sıralamaya yazılsın — takma adın:
        </label>
        <div className="flex gap-2">
          <input value={nick} onChange={(e) => setNickState(e.target.value)} maxLength={20}
            onKeyDown={(e) => e.key === 'Enter' && saveNickAndSubmit()}
            placeholder="Örn: Ahmet"
            className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }} />
          <button onClick={saveNickAndSubmit} className="btn-gold shrink-0 rounded-lg px-4 py-2 text-sm font-bold">
            Kaydet
          </button>
        </div>
      </div>
    )
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

  // Günlük: bitince sıradaki TAMAMLANMAMIŞ mod (kanonik sırada). DAILY_SUBS kullanılır —
  // Silüet/Hikâye gibi daily:false modlar Günlük akışına girmez. Mevcut mod zaten
  // kaydedildiği için atlanır; hepsi bitmişse null → "gün tamam" gösterilir.
  const nextDailySub = daily && (won || outOfGuesses)
    ? DAILY_SUBS.find((m) => !getDailyState(m.id).done)?.id ?? null
    : null

  const topName = TOP_MODES.find((m) => m.id === top)!.name
  const subName = subMeta(sub).name // mix dahil
  const activeMeta = SUB_MODES.find((m) => m.id === activeSub)! // o anki gerçek tip (rozet için)
  const stats = getStats(top, sub, diff)

  return (
    <div className="relative isolate min-h-[100dvh] w-full overflow-x-hidden">
      <GameBackdrop src="/mg-main.png" />
      <div className="relative z-10 mx-auto flex w-full max-w-3xl lg:max-w-4xl flex-col items-center gap-4 px-3 pb-10">
      {/* Ekran okuyucu duyurusu — görsel olarak gizli, tahmin sonucunu sesli okur */}
      <div className="sr-only" role="status" aria-live="polite">{announce}</div>

      {/* Üst çubuk */}
      <GameHeader
        topName={topName}
        subName={subName}
        isMix={isMix}
        puzzle={puzzle}
        timedOver={timedOver}
        activeMetaIcon={activeMeta.icon}
        activeMetaName={activeMeta.name}
        daily={daily}
        diff={diff}
        filter={filter}
        timed={timed}
        timeLeft={timeLeft}
        finished={finished}
        left={left}
        currentStreak={stats.currentStreak}
        onExit={onExit}
        onOpenHowTo={() => setHowTo(true)}
      />

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
          <button onClick={startTimed} className="btn-gold rounded-xl px-8 py-3 text-lg font-bold">
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
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={startTimed} className="btn-gold rounded-xl px-6 py-3 font-bold">
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

          {/* Takma ad yoksa skor sıralamaya yazılamadı — burada sorulur, girilince gönderilir */}
          {renderNickPrompt()}
          {lbSaved && (
            <p className="text-sm font-semibold" style={{ color: 'var(--accent-done)' }}>✓ Skorun sıralamaya gönderildi</p>
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
              {won && !timed && <WinConfetti />}
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
                  {won ? `${guesses.length} denemede bildin` : `${guesses.length} tahminde bulamadın`}
                </div>
              </div>

              {/* Yetenek modu: tuş bonusunun sonucu */}
              {slotOk !== undefined && (
                <span className="text-sm font-semibold" style={{ color: slotOk ? 'var(--correct)' : 'var(--danger-text)' }}>
                  {slotOk
                    ? `Tuş da doğru: ${SLOT_LABELS[spellIndex]}${timed ? ' (+1)' : ''}`
                    : `Tuş yanlış — doğrusu ${SLOT_LABELS[spellIndex]}`}
                </span>
              )}
              {outOfGuesses && bonusMode && (
                <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                  Tuş: <b style={{ color: 'var(--gold)' }}>{SLOT_LABELS[spellIndex]}</b>
                </span>
              )}

              {/* Eşya modunda şampiyon yok — bilgi kartı yalnız şampiyonlu modlarda */}
              {puzzle.sub !== 'item' && (
                <button onClick={() => setInfo(true)} className="card-btn rounded-xl border px-4 py-1.5 text-sm font-semibold"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
                  🔍 {puzzle.champion.name} hakkında
                </button>
              )}

              {!daily ? (
                <button onClick={nextRound} className="btn-gold rounded-xl px-6 py-2.5 font-bold">
                  Sonraki →
                </button>
              ) : (
                <div className="flex w-full flex-col items-center gap-3">
                  {/* Metin + Görsel yan yana */}
                  <div className="flex justify-center gap-3">
                    <button onClick={share} className="card-btn rounded-xl border px-5 py-2.5 font-bold"
                      style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
                      {copied ? '✓ Kopyalandı' : 'Metin'}
                    </button>
                    <button onClick={shareAsImage} className="card-btn rounded-xl border px-5 py-2.5 font-bold"
                      style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
                      {imgResult || '🖼 Görsel'}
                    </button>
                  </div>
                  {/* Sıradaki mod altta, belirgin — menüye dönmeden geç */}
                  {nextDailySub && (
                    <button onClick={() => onPlaySub(nextDailySub)} className="btn-gold w-full rounded-xl px-5 py-2.5 font-bold">
                      Sıradaki: {subMeta(nextDailySub).icon} {subMeta(nextDailySub).name} →
                    </button>
                  )}
                </div>
              )}
              {renderNickPrompt()}
              {lbSaved && (
                <p className="text-sm font-semibold" style={{ color: 'var(--accent-done)' }}>✓ Skorun sıralamaya gönderildi</p>
              )}
              {daily && (
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                  {nextDailySub ? 'Tüm günlük modları sırayla bitir.' : '🎉 Bugünün tüm modlarını bitirdin! Yarın yenileri gelecek.'}
                </p>
              )}
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
                // Eşya ve Kostüm tahminleri şampiyon değil: adı seçenek listesinden bul.
                // (Eşyada `byId` boş dönüyordu ve rozetlerde ham id — "3107" — görünüyordu.)
                const label = activeSub === 'skin' || activeSub === 'item'
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
      {info && puzzle && puzzle.sub !== 'item' && (
        <ChampionInfo
          champion={puzzle.champion}
          splashNum={puzzle.skin?.num ?? puzzle.splashNum ?? 0}
          onClose={() => setInfo(false)}
        />
      )}

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
    </div>
  )
}
