import { useEffect, useMemo, useState } from 'react'
import { squareUrl } from '../game/data'
import { playCorrect, playLose, playWin, playWrong } from '../game/sfx'
import { copyToClipboard } from '../game/share'
import { todayKey } from '../game/rng'
import {
  ALPHABET, LEN_BUCKETS, bucketOf, dailyWord, evaluateWord, getLenBucket, mergeKeyState, recordWordleWin, sameLengthChampions,
  setLenBucket, toLetters, wordlePool,
  type LenBucket, type LetterResult,
} from '../game/wordle'
import { evaluateAchievements } from '../game/achievements'
import { WORDLE_DAILY_KEY as KEY } from '../game/miniDaily'
import { godMode } from '../game/dev'
import type { Champion } from '../game/types'
import { type AcOption } from './Autocomplete'
import ChampionInfo from './ChampionInfo'

const MAX_TRIES = 6

const CELL_BG: Record<LetterResult, string> = {
  correct: 'var(--correct)',
  present: 'var(--partial)',
  absent: 'var(--wrong)',
}

/** Günlük durum — mod başına değil, tek anahtar (Kelime'nin kendi günlüğü). Anahtar: miniDaily.ts (tek kaynak) */
interface DailyState { date: string; guesses: string[]; done: boolean }

function loadDaily(): DailyState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as DailyState
      if (s.date === todayKey()) return s
    }
  } catch { /* yoksay */ }
  return { date: todayKey(), guesses: [], done: false }
}

interface Props {
  daily: boolean // true = günlük (herkeste aynı, günde bir), false = sınırsız
  onExit: () => void
}

/** Havuzdan rastgele — art arda aynı şampiyonu vermez (avoid ile son hedef atlanır) */
function pickRandom(pool: Champion[], avoidId?: string): Champion {
  if (pool.length <= 1) return pool[0]
  let c = pool[Math.floor(Math.random() * pool.length)]
  while (c.id === avoidId) c = pool[Math.floor(Math.random() * pool.length)]
  return c
}

export default function WordleGame({ daily, onExit }: Props) {
  // Uzunluk tercihi yalnız Sınırsız'da geçerli — Günlük herkeste aynı olmalı
  const [bucket, setBucket] = useState<LenBucket>(getLenBucket)
  const pool = useMemo(() => wordlePool(daily ? 'all' : bucket), [daily, bucket])
  const [target, setTarget] = useState<Champion>(() =>
    daily ? dailyWord() : pickRandom(wordlePool(getLenBucket())),
  )
  const [info, setInfo] = useState(false) // sonuç: şampiyon bilgi kartı

  function pickBucket(b: LenBucket) {
    setBucket(b)
    setLenBucket(b)
    setTarget(pickRandom(wordlePool(b), target.id))
    setGuesses([])
    setCopied(false)
  }
  const word = toLetters(target.name)

  // God mode (yalnız yerel dev): kayıtlı günlük tahminleri yükleme → her giriş taze
  const [guesses, setGuesses] = useState<string[]>(() => (daily && !godMode() ? loadDaily().guesses : []))
  const [copied, setCopied] = useState(false)
  const [text, setText] = useState('') // yazılan tahmin (öneri listesi yok; kendin yazarsın)
  const [inputErr, setInputErr] = useState(false) // geçersiz/tekrar tahminde titreşim

  const rows = guesses.map((g) => ({ g, res: evaluateWord(g, word) }))
  const won = guesses.some((g) => g === word)
  const finished = won || guesses.length >= MAX_TRIES

  // Klavye renkleri: her harfin en iyi sonucu
  const keyState = useMemo(() => {
    const m = new Map<string, LetterResult>()
    for (const { g, res } of rows) {
      [...g].forEach((ch, i) => m.set(ch, mergeKeyState(m.get(ch), res[i])))
    }
    return m
  }, [rows])

  // Aynı harf sayısındaki şampiyonlar — tahmin listesi
  const options: AcOption[] = useMemo(
    () => sameLengthChampions(word.length).map((c) => ({ key: c.id, label: c.name, img: squareUrl(c.id) })),
    [word.length],
  )
  const guessedSet = useMemo(
    () => new Set(options.filter((o) => guesses.includes(toLetters(o.label))).map((o) => o.key)),
    [options, guesses],
  )

  useEffect(() => {
    if (daily) localStorage.setItem(KEY, JSON.stringify({ date: todayKey(), guesses, done: finished }))
  }, [daily, guesses, finished])

  function handlePick(champId: string) {
    if (finished) return
    const c = options.find((o) => o.key === champId)
    if (!c) return
    const g = toLetters(c.label)
    const next = [...guesses, g]
    setGuesses(next)
    if (g === word) {
      playWin()
      recordWordleWin(next.length)
      // Rozetleri sessizce işle (toast yok; Başarım paneli açılınca görünür)
      evaluateAchievements()
    } else if (next.length >= MAX_TRIES) playLose()
    else playWrong()
  }

  /** Yazılan adı geçerli (aynı harf sayılı) bir şampiyonla eşleştirip gönderir. */
  function submitTyped() {
    if (finished) return
    const letters = toLetters(text.trim())
    if (!letters) return
    // Ad harflere indirgenip eşleşir (Kai'Sa→KAISA, "Master Yi"→MASTERYI); büyük/küçük ve işaret önemsiz
    const match = options.find((o) => toLetters(o.label) === letters)
    if (!match || guessedSet.has(match.key)) {
      setInputErr(true) // gerçek şampiyon değil, yanlış uzunlukta ya da zaten denenmiş
      playWrong()
      return
    }
    handlePick(match.key)
    setText('')
  }

  function nextRound() {
    setTarget(pickRandom(pool, target.id))
    setGuesses([])
    setCopied(false)
    setInfo(false)
    playCorrect()
  }

  async function share() {
    const grid = rows
      .map(({ res }) => res.map((r) => (r === 'correct' ? '🟩' : r === 'present' ? '🟨' : '⬛')).join(''))
      .join('\n')
    const head = won ? `${guesses.length}/${MAX_TRIES}` : `X/${MAX_TRIES}`
    const text = `Vadi Tahmini — Kelime${daily ? ` ${todayKey()}` : ''} ${head}\n${grid}`
    if (await copyToClipboard(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-3 pb-10">
      <div className="flex w-full items-center justify-between gap-2 border-b pt-3 pb-2"
        style={{ borderColor: 'var(--border)' }}>
        <button onClick={onExit} className="card-btn rounded-xl border px-3 py-1.5 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
          ← Menü
        </button>
        <span className="font-display font-semibold" style={{ color: 'var(--gold)' }}>
          Kelime {daily && '· Günlük'}
        </span>
        <span className="w-16 text-right text-sm" style={{ color: 'var(--text-dim)' }}>
          {finished ? '' : `${MAX_TRIES - guesses.length} hak`}
        </span>
      </div>

      {/*
        Uzunluk şeridi — havuz kendiliğinden 5-6 harflilere yığılıyor (%53).
        Günlük'te YOK: tercih günlüğü değiştirseydi herkes farklı kelime görürdü.
      */}
      {!daily && (
        <div className="w-full">
          <div className="flex overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            {LEN_BUCKETS.map((b) => (
              <button key={b.id} onClick={() => pickBucket(b.id)}
                className="flex-1 px-1 py-2 text-xs font-bold transition-colors sm:text-sm"
                style={{
                  background: bucket === b.id ? 'var(--gold)' : 'transparent',
                  color: bucket === b.id ? 'var(--on-gold)' : 'var(--text-dim)',
                }}>
                {b.name}
                <span className="ml-1 font-normal opacity-70">
                  {b.id === 'all' ? '4-10' : `${b.min}-${b.max}`}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-1 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
            {bucketOf(bucket).name} havuzunda <b style={{ color: 'var(--text)' }}>{pool.length}</b> şampiyon
            {bucket === 'all' && ' · doğal dağılım: 5-6 harfliler daha sık gelir'}
          </p>
        </div>
      )}

      <p className="text-center text-sm" style={{ color: 'var(--text-dim)' }}>
        <b style={{ color: 'var(--text)' }}>{word.length} harfli</b> bir şampiyon adı.
        Aynı harf sayısındaki şampiyonlardan tahmin et.
      </p>

      {/* Izgara: her satır bir tahmin, boş satırlar kalan haklar */}
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: MAX_TRIES }).map((_, r) => {
          const row = rows[r]
          return (
            <div key={r} className={`flex justify-center gap-1.5 ${row && r === rows.length - 1 ? 'anim-row' : ''}`}>
              {Array.from({ length: word.length }).map((__, i) => (
                <span key={i}
                  className="flex items-center justify-center rounded-md border font-display font-bold"
                  style={{
                    width: `min(2.6rem, ${Math.floor(320 / word.length)}px)`,
                    height: `min(2.6rem, ${Math.floor(320 / word.length)}px)`,
                    fontSize: word.length > 8 ? '0.85rem' : '1.1rem',
                    background: row ? CELL_BG[row.res[i]] : 'transparent',
                    borderColor: row ? 'transparent' : 'var(--border)',
                    color: row ? '#fff' : 'var(--text)',
                  }}>
                  {row ? row.g[i] : ''}
                </span>
              ))}
            </div>
          )
        })}
      </div>

      {/*
        Harf tahtası — tüm harfler görünür; yeşil/sarı/gri kullanılanı,
        nötr olan henüz denenmemişi gösterir. Eleme (dedüksiyon) kolaylaşır.
        Girdi yine ad-otomatik tamamlamayla; bu tahta yalnızca ipucu panosu.
      */}
      <div className="flex max-w-md flex-wrap justify-center gap-1">
        {ALPHABET.map((ch) => {
          const st = keyState.get(ch)
          return (
            <span key={ch} className="flex h-7 w-6 items-center justify-center rounded-md text-xs font-bold transition-colors"
              style={{
                background: st ? CELL_BG[st] : 'var(--bg-input)',
                color: st ? '#fff' : 'var(--text-dim)',
                opacity: st === 'absent' ? 0.55 : 1, // elenen harf geri planda kalsın
              }}>
              {ch}
            </span>
          )
        })}
      </div>

      {!finished && (
        <div className={`flex w-full gap-2 ${inputErr ? 'anim-shake' : ''}`} onAnimationEnd={() => setInputErr(false)}>
          <input
            value={text}
            onChange={(e) => { setText(e.target.value); setInputErr(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') submitTyped() }}
            placeholder={`${word.length} harfli şampiyon yaz...`}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label={`${word.length} harfli şampiyon adını yaz ve Enter'a bas`}
            className="min-w-0 flex-1 rounded-xl border px-4 py-3 text-base outline-none transition-colors"
            style={{ background: 'var(--bg-input)', borderColor: inputErr ? 'var(--danger)' : 'var(--border)', color: 'var(--text)' }}
          />
          <button onClick={submitTyped} className="btn-gold shrink-0 rounded-xl px-5 py-3 font-bold" aria-label="Tahmini gönder">
            Tahmin
          </button>
        </div>
      )}

      {finished && (
        <div className="anim-pop flex w-full flex-col items-center gap-3 rounded-xl border p-4 text-center"
          style={{ borderColor: won ? 'var(--correct)' : 'var(--danger)', background: 'var(--bg-card)' }}>
          <img src={squareUrl(target.id)} alt="" className="h-16 w-16 rounded-xl" />
          <span className="font-display text-lg font-bold" style={{ color: won ? 'var(--correct)' : 'var(--danger-text)' }}>
            {won ? `🎉 ${target.name} — ${guesses.length} denemede` : `😔 Cevap: ${target.name}`}
          </span>
          <button onClick={() => setInfo(true)} className="card-btn rounded-xl border px-4 py-1.5 text-sm font-semibold"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            🔍 {target.name} hakkında
          </button>
          <div className="flex flex-wrap justify-center gap-3">
            {!daily && (
              <button onClick={nextRound} className="btn-gold rounded-xl px-6 py-2.5 font-bold">
                Sonraki →
              </button>
            )}
            <button onClick={share} className="card-btn rounded-xl border px-5 py-2.5 font-bold"
              style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
              {copied ? '✓ Kopyalandı' : 'Paylaş'}
            </button>
          </div>
          {daily && <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Yarın yeni kelime seni bekliyor.</p>}
        </div>
      )}

      {info && <ChampionInfo champion={target} onClose={() => setInfo(false)} />}
    </div>
  )
}
