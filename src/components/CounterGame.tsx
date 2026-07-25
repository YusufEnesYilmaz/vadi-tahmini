import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COUNT_SECONDS, PENALTY_SECONDS, WRONG_STREAK_PENALTY, getCounterBest, isInChallenge, randomChallenge, recordCounterScore, type CountChallenge } from '../game/counter'
import { byId, squareUrl } from '../game/data'
import { playCorrect, playLose, playWin, playWrong } from '../game/sfx'
import { copyToClipboard } from '../game/share'
import { getTimedSecondsLeft } from '../game/timed'
import CounterBoard from './CounterBoard'
import ExitConfirm from './ExitConfirm'
import GameBackdrop from './game/GameBackdrop'

interface Props {
  onExit: () => void
}

/**
 * "Kaç Tane?" — süreli sayım modu (tek kişilik Sınırsız). Bir ölçüt verilir,
 * oyuncu o ölçüte uyan şampiyonları arka arkaya yazar; süre dolunca ya da hepsini
 * bulunca tur biter.
 *
 * Öneri listesi VAR (kullanıcı isteği) ama **TÜM şampiyonları** gösterir, ölçüte
 * uyanları değil — liste ölçüte göre süzülseydi listenin kendisi cevap anahtarı olurdu.
 * Yanlış seçim cezasız: altta kırmızı listede birikir, deneme yapmak serbest.
 */
export default function CounterGame({ onExit }: Props) {
  const [started, setStarted] = useState(false)
  const [challenge, setChallenge] = useState<CountChallenge | null>(null)
  const [found, setFound] = useState<string[]>([]) // bulunan şampiyon id'leri (yazım sırası)
  const [wrong, setWrong] = useState<string[]>([]) // ölçüte uymayan denemeler (altta kırmızı)
  const [wrongStreak, setWrongStreak] = useState(0) // ART ARDA yanlış — doğru bulunca sıfırlanır
  const [penalty, setPenalty] = useState(false) // "−10s" rozeti kısa süre görünsün
  const [left, setLeft] = useState(COUNT_SECONDS)
  const [over, setOver] = useState(false)
  const [inputErr, setInputErr] = useState(false)
  const [copied, setCopied] = useState(false)
  const [best, setBest] = useState(getCounterBest)
  const [isRecord, setIsRecord] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef(0)
  const penaltySecondsRef = useRef(0)

  const total = challenge?.ids.length ?? 0
  const allFound = started && total > 0 && found.length === total
  const finished = over || allFound

  // Kaçırılan şampiyonlar (sonuç ekranında soluk gösterilir)
  const missed = useMemo(
    () => (challenge ? challenge.ids.filter((id) => !found.includes(id)) : []),
    [challenge, found],
  )

  const refreshClock = useCallback((nowMs = Date.now()) => {
    if (!startedAtRef.current) return
    const nextLeft = getTimedSecondsLeft(startedAtRef.current, COUNT_SECONDS, nowMs, {
      penaltySeconds: penaltySecondsRef.current,
    })
    setLeft(nextLeft)
    if (nextLeft === 0) {
      if (timerRef.current) clearInterval(timerRef.current)
      setOver(true)
    }
  }, [])

  // Sayaç — hepsi bulununca (allFound) ya da süre bitince durur.
  useEffect(() => {
    if (!started || finished) return
    refreshClock()
    timerRef.current = setInterval(() => refreshClock(Date.now()), 250)
    const onVisibilityChange = () => refreshClock(Date.now())
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [started, finished, refreshClock])

  // Bitiş: skor kaydı + ses (bir kez)
  const scoredRef = useRef(false)
  useEffect(() => {
    if (!finished || scoredRef.current) return
    scoredRef.current = true
    if (allFound) playWin(); else playLose()
    setIsRecord(recordCounterScore(found.length))
    setBest(getCounterBest())
  }, [finished, allFound, found.length])

  function start() {
    if (timerRef.current) clearInterval(timerRef.current)
    setChallenge(randomChallenge(challenge?.label))
    setFound([])
    setWrong([])
    setWrongStreak(0)
    setPenalty(false)
    startedAtRef.current = Date.now()
    penaltySecondsRef.current = 0
    setLeft(COUNT_SECONDS)
    setOver(false)
    setIsRecord(false)
    scoredRef.current = false
    setStarted(true)
  }

  /** Öneri listesinden seçilen şampiyon (metin değil id gelir) */
  function pick(id: string) {
    if (!challenge || finished) return
    if (found.includes(id) || wrong.includes(id)) return // zaten denendi, ekranda duruyor
    if (!isInChallenge(challenge, id)) {
      // Ölçüt dışı — altta kırmızı listeye düşer. Tek yanlış bedelsiz;
      // ART ARDA WRONG_STREAK_PENALTY tanesi süreden PENALTY_SECONDS yakar.
      setWrong((w) => [...w, id])
      setInputErr(true)
      const streak = wrongStreak + 1
      if (streak >= WRONG_STREAK_PENALTY) {
        setWrongStreak(0) // ceza bir kez uygulanır, sonraki her yanlışta değil
        penaltySecondsRef.current += PENALTY_SECONDS
        refreshClock()
        setPenalty(true)
        setTimeout(() => setPenalty(false), 1500)
        playLose()
      } else {
        setWrongStreak(streak)
        playWrong()
      }
      return
    }
    setFound((f) => [...f, id])
    setWrongStreak(0) // doğru bulmak seriyi sıfırlar — arada bilen ceza yemez
    playCorrect()
  }

  async function share() {
    if (!challenge) return
    const text2 = `Vadi Tahmini — Kaç Tane?\n"${challenge.label}" · ${found.length}/${total} buldum${allFound ? ' (hepsi! 🏆)' : ''}`
    if (await copyToClipboard(text2)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="relative isolate min-h-[100dvh] w-full overflow-x-hidden">
      <GameBackdrop src="/mg-counter.png" />
      <div className="relative z-10 mx-auto flex w-full max-w-2xl lg:max-w-3xl flex-col items-center gap-4 px-3 pb-10">
      {/* Üst bar */}
      <div className="flex w-full items-center justify-between gap-2 border-b pt-3 pb-2" style={{ borderColor: 'var(--border)' }}>
        {/*
          Onay YALNIZ tur sürerken ve EN AZ BİR tahminden sonra sorulur (kullanıcı
          kararı): hiçbir şey yapmadan çıkarken soru sormak gereksiz sürtünme,
          tahmin yapıldıysa kaybedilecek bir şey var.
        */}
        <button onClick={() => (started && !finished && found.length + wrong.length > 0 ? setConfirmExit(true) : onExit())}
          className="card-btn rounded-xl border px-3 py-1.5 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
          ← Menü
        </button>
        <span className="font-display font-semibold" style={{ color: 'var(--gold)' }}>Kaç Tane?</span>
        {started && !finished ? (
          <span className="flex items-center gap-2">
            {penalty && (
              <span className="anim-pop rounded-md px-1.5 py-0.5 text-xs font-bold"
                style={{ background: 'var(--danger)', color: '#fff' }}>
                −{PENALTY_SECONDS}s
              </span>
            )}
            <span className="text-sm tabular-nums" style={{ color: 'var(--text-dim)' }}>
              <b style={{ color: 'var(--gold)' }}>{found.length}</b>/{total}
            </span>
            <span className={`rounded-xl px-3 py-1.5 font-mono font-bold ${left <= 10 ? 'anim-pulse' : ''}`}
              style={{ background: left <= 10 ? 'var(--danger)' : 'var(--bg-card)', color: '#fff' }}>
              {left}s
            </span>
          </span>
        ) : <span className="w-14" />}
      </div>

      {/* Başlangıç ekranı — kartta: ikon rozeti + kurallar + rekor (masaüstünde havada durmasın) */}
      {!started && (
        <div className="anim-pop mt-6 flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border p-6 text-center panel"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <span className="grid h-16 w-16 place-items-center rounded-2xl text-4xl shadow-inner"
            style={{ background: 'rgba(var(--gold-glow-rgb), 0.12)', border: '1px solid rgba(var(--gold-glow-rgb), 0.3)' }}>
            🔢
          </span>
          <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--gold-bright)' }}>Kaç Tane?</h2>
          <p className="max-w-sm text-sm" style={{ color: 'var(--text)' }}>
            Ekrana bir ölçüt gelir (ör. <b>Zaun</b> ya da <b>Yordle</b>). O ölçüte uyan şampiyonları
            arka arkaya yaz — <b>{COUNT_SECONDS} saniyede</b> kaç tanesini bulabilirsin?
          </p>
          <p className="max-w-sm text-xs" style={{ color: 'var(--text-dim)' }}>
            Yanlış deneme serbest, ama <b style={{ color: 'var(--danger-text)' }}>üst üste {WRONG_STREAK_PENALTY} yanlış</b> süreden {PENALTY_SECONDS} saniye yakar.
            Arada bir doğru bulmak seriyi sıfırlar.
          </p>
          {best > 0 && <p className="text-sm" style={{ color: 'var(--text-dim)' }}>En iyin: <b style={{ color: 'var(--gold)' }}>{best}</b></p>}
          <button onClick={start} className="btn-gold rounded-xl px-8 py-3 text-lg font-bold">Başla</button>
        </div>
      )}

      {started && challenge && (
        <>
          <CounterBoard
            challenge={challenge}
            found={found}
            wrong={wrong}
            wrongStreak={wrongStreak}
            finished={finished}
            shake={inputErr}
            onShakeEnd={() => setInputErr(false)}
            onPick={pick}
          />

          {/* Sonuç */}
          {finished && (
            <div className="anim-pop flex w-full flex-col items-center gap-3 rounded-xl border p-4 text-center"
              style={{ borderColor: allFound ? 'var(--correct)' : 'var(--danger)', background: 'var(--bg-card)' }}>
              <span className="font-display text-lg font-bold" style={{ color: allFound ? 'var(--correct)' : 'var(--danger-text)' }}>
                {allFound ? `🏆 Hepsini buldun! ${found.length}/${total}` : `⏱ Süre bitti — ${found.length}/${total}`}
              </span>
              {isRecord && <span className="text-sm font-bold" style={{ color: 'var(--gold-bright)' }}>✨ Yeni rekor!</span>}

              {/* Kaçırılanlar */}
              {missed.length > 0 && (
                <div className="w-full">
                  <div className="mb-1.5 text-xs uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Kaçırdıkların</div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {missed.map((id) => {
                      const c = byId(id)
                      return (
                        <span key={id} className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
                          <img src={squareUrl(id)} alt="" className="h-4 w-4 rounded" />
                          {c?.name ?? id}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-3 pt-1">
                <button onClick={start} className="btn-gold rounded-xl px-6 py-2.5 font-bold">Tekrar</button>
                <button onClick={share} className="card-btn rounded-xl border px-5 py-2.5 font-bold"
                  style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
                  {copied ? '✓ Kopyalandı' : 'Paylaş'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {confirmExit && (
        <ExitConfirm
          title="Turdan çıkılsın mı?"
          onStay={() => setConfirmExit(false)}
          onLeave={onExit}
        >
          Tur sürüyor — çıkarsan <b style={{ color: 'var(--text)' }}>{found.length} bulduğun</b> kaydedilmez.
          {' '}Karar verirken <b style={{ color: 'var(--danger-text)' }}>süre akmaya devam ediyor.</b>
        </ExitConfirm>
      )}
      </div>
    </div>
  )
}
