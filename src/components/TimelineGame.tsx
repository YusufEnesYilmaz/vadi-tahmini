import { useEffect, useRef, useState } from 'react'
import { byId, squareUrl } from '../game/data'
import { playCorrect, playLose, playWin, playWrong } from '../game/sfx'
import { copyToClipboard } from '../game/share'
import { todayKey } from '../game/rng'
import {
  dailyTimeline,
  evaluateOrder,
  loadDailyTimeline,
  randomTimeline,
  recordTimelineWin,
  saveDailyTimeline,
  swapItems,
  TIMELINE_MAX_ATTEMPTS,
  type TimelinePuzzle,
} from '../game/timeline'
import { evaluateAchievements } from '../game/achievements'
import WinConfetti from './game/WinConfetti'
import GameShell from './game/GameShell'
import { useModalFocusTrap } from './useModalFocusTrap'
import type { Champion } from '../game/types'

interface TimelineGameProps {
  daily?: boolean
  onExit: () => void
}

/**
 * Zaman Tüneli — 5 şampiyonu çıkış yılına göre ESKİDEN YENİYE sırala.
 * lolchallenge'dan bilinçli sapma: tek deneme değil 3 deneme; doğru pozisyonlar
 * yeşile KİLİTLENİR (▲▼ ile taşınamaz). Sürükle-bırak YOK — ok butonları
 * (bağımlılık eklemiyoruz + mobil + klavye erişilebilirliği bedava).
 */
export default function TimelineGame({ daily = false, onExit }: TimelineGameProps) {
  const sessionDate = useRef(todayKey()).current
  const [started, setStarted] = useState(false)
  const [showHowTo, setShowHowTo] = useState(false)
  const howToDialogRef = useModalFocusTrap<HTMLDivElement>(showHowTo)

  const [puzzle, setPuzzle] = useState<TimelinePuzzle | null>(null)
  const [currentOrder, setCurrentOrder] = useState<Champion[]>([])
  const [locked, setLocked] = useState<boolean[]>([false, false, false, false, false])
  const [attempts, setAttempts] = useState(0)
  const [over, setOver] = useState(false)
  const [won, setWon] = useState(false)
  const [history, setHistory] = useState<boolean[][]>([])
  const [shaking, setShaking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [announce, setAnnounce] = useState('') // ekran okuyucu duyurusu

  // Sürükle-bırak (Drag & Drop) durumu
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  // İlk yükleme: günlükte kayıtlı durum varsa kaldığı yerden (bitmişse sonuç ekranı)
  useEffect(() => {
    if (daily) {
      const saved = loadDailyTimeline()
      if (saved) {
        const targetChamps = saved.targetIds.map((id) => byId(id)).filter(Boolean) as Champion[]
        const currentChamps = saved.currentIds.map((id) => byId(id)).filter(Boolean) as Champion[]

        if (targetChamps.length === 5 && currentChamps.length === 5) {
          setPuzzle({ target: targetChamps, initial: currentChamps })
          setCurrentOrder(currentChamps)
          setLocked(saved.locked)
          setAttempts(saved.attempts)
          setOver(saved.over)
          setWon(saved.won)
          setStarted(true)
          return
        }
      }
      const dt = dailyTimeline()
      setPuzzle(dt)
      setCurrentOrder(dt.initial)
    } else {
      const rt = randomTimeline()
      setPuzzle(rt)
      setCurrentOrder(rt.initial)
    }
  }, [daily])

  // Escape = nasıl oynanır modalını kapat (diğer modallarla tutarlı)
  useEffect(() => {
    if (!showHowTo) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowHowTo(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showHowTo])

  const startNewGame = (avoidIds?: string[]) => {
    const nextP = daily ? dailyTimeline() : randomTimeline(avoidIds)
    setPuzzle(nextP)
    setCurrentOrder(nextP.initial)
    setLocked([false, false, false, false, false])
    setAttempts(0)
    setOver(false)
    setWon(false)
    setHistory([])
    setShaking(false)
    setCopied(false)
    setDraggedIdx(null)
    setDragOverIdx(null)
    setStarted(true)
  }

  /** Günlük durumu depoya yaz — tarih HEP todayKey() (yerel; UTC gece 00-03'te günü kaydırır) */
  const persistDaily = (currentIds: string[], nextLocked: boolean[], nextAttempts: number, isOver: boolean, isWon: boolean) => {
    if (!daily || !puzzle) return
    saveDailyTimeline({
      date: sessionDate,
      targetIds: puzzle.target.map((c) => c.id),
      currentIds,
      locked: nextLocked,
      attempts: nextAttempts,
      over: isOver,
      won: isWon,
    })
  }

  // Hamle yapma (yukarı/aşağı değiştirme) — günlükte HER hamle kaydedilir (Bingo kalıbı:
  // yenilemede dizilim son onaya değil son hamleye dönsün)
  const handleSwap = (i: number, j: number) => {
    if (over || won) return
    if (locked[i] || locked[j]) return
    const nextOrder = swapItems(currentOrder, i, j)
    setCurrentOrder(nextOrder)
    persistDaily(nextOrder.map((c) => c.id), locked, attempts, over, won)
  }

  // Sürükle-Bırak olay işleyicileri (Drag & Drop)
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    if (locked[idx] || over || won) return
    setDraggedIdx(idx)
    e.dataTransfer.setData('text/plain', String(idx))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (locked[idx] || over || won) return
    if (dragOverIdx !== idx) setDragOverIdx(idx)
  }

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault()
    setDragOverIdx(null)
    if (draggedIdx === null || draggedIdx === targetIdx) return
    if (locked[draggedIdx] || locked[targetIdx] || over || won) return
    handleSwap(draggedIdx, targetIdx)
    setDraggedIdx(null)
  }

  const handleDragEnd = () => {
    setDraggedIdx(null)
    setDragOverIdx(null)
  }

  // Sırayı Onayla
  const handleCheck = () => {
    if (!puzzle || over || won) return

    const nextLocked = evaluateOrder(currentOrder, puzzle.target)
    const nextAttempts = attempts + 1
    const isWon = nextLocked.every(Boolean)
    const isOver = isWon || nextAttempts >= TIMELINE_MAX_ATTEMPTS

    setLocked(nextLocked)
    setAttempts(nextAttempts)
    setWon(isWon)
    setOver(isOver)
    setHistory((prev) => [...prev, nextLocked])

    const correctCount = nextLocked.filter(Boolean).length
    if (isWon) {
      playWin()
      setAnnounce(`Tebrikler! ${nextAttempts} denemede tüm sırayı buldun.`)
      // Rozet sayaçları + sessiz değerlendirme (toast sistemi GameScreen'de — mini oyun kuralı)
      recordTimelineWin(nextAttempts)
      evaluateAchievements()
    } else if (isOver) {
      playLose()
      setAnnounce('Deneme hakkın bitti. Doğru sıralama ekranda.')
    } else {
      // Yeni kilitlenen pozisyon varsa olumlu ses, yoksa yanlış sesi
      const newlyCorrect = nextLocked.some((val, idx) => val && !locked[idx])
      if (newlyCorrect) playCorrect(); else playWrong()
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
      setAnnounce(`${correctCount} şampiyon doğru pozisyonda. ${TIMELINE_MAX_ATTEMPTS - nextAttempts} hakkın kaldı.`)
    }

    persistDaily(currentOrder.map((c) => c.id), nextLocked, nextAttempts, isOver, isWon)
  }

  async function share() {
    if (!puzzle) return
    const head = won ? `${attempts}/${TIMELINE_MAX_ATTEMPTS}` : `X/${TIMELINE_MAX_ATTEMPTS}`
    const grid = history.map((h) => h.map((b) => (b ? '🟩' : '🟥')).join('')).join('\n')
    const text = `Vadi Tahmini — Zaman Tüneli${daily ? ` ${todayKey()}` : ''} ${head}\n${grid}`
    if (await copyToClipboard(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!puzzle) return null

  // Başlangıç ekranı (günlük bitmişse atlanır — sonuç ekranına düşülür)
  if (!started && (!daily || (!over && !won))) {
    return (
      <GameShell>
        <div className="anim-pop w-full rounded-2xl border p-6 text-center"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' }}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border text-3xl"
            style={{ borderColor: 'var(--gold)', background: 'rgba(var(--gold-glow-rgb),0.08)' }}>
            🕰️
          </div>
          <h1 className="font-display mt-3 text-2xl font-bold" style={{ color: 'var(--gold)' }}>Zaman Tüneli</h1>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>
            {daily ? 'Günlük — herkese aynı 5 şampiyon' : 'Sınırsız'}
          </p>

          <div className="mt-4 rounded-xl border p-4 text-left text-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}>
            <p className="section-label mb-2" style={{ color: 'var(--gold)' }}>Nasıl oynanır?</p>
            <ul className="space-y-1.5 text-xs" style={{ color: 'var(--text-dim)' }}>
              <li>• 5 şampiyonu çıkış yılına göre <b style={{ color: 'var(--text)' }}>eskiden yeniye</b> sırala.</li>
              <li>• ▲ ▼ butonlarıyla yer değiştir, <b style={{ color: 'var(--text)' }}>"Sırayı Onayla"</b> ile kontrol et.</li>
              <li>• Doğru pozisyonlar <b style={{ color: 'var(--correct)' }}>yeşile kilitlenir</b> 🔒 ve yılı görünür.</li>
              <li>• Toplam <b style={{ color: 'var(--text)' }}>{TIMELINE_MAX_ATTEMPTS} hakkın</b> var.</li>
            </ul>
          </div>

          <div className="mt-5 flex gap-3">
            <button onClick={onExit} className="card-btn flex-1 rounded-xl border px-4 py-3 text-sm font-semibold"
              style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
              ← Menü
            </button>
            <button onClick={() => setStarted(true)} className="btn-gold flex-1 rounded-xl px-4 py-3 text-sm font-bold">
              Başla
            </button>
          </div>
        </div>
      </GameShell>
    )
  }

  return (
    <GameShell>
      {won && <WinConfetti />}
      {/* Üst bar — mini oyun kalıbı (Kelime ile aynı ritim) */}
      <div className="flex w-full items-center justify-between gap-2 border-b pt-3 pb-2"
        style={{ borderColor: 'var(--border)' }}>
        <button onClick={onExit} className="card-btn rounded-xl border px-3 py-1.5 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
          ← Menü
        </button>
        <span className="font-display font-semibold" style={{ color: 'var(--gold)' }}>
          🕰️ Zaman Tüneli {daily && '· Günlük'}
        </span>
        <button onClick={() => setShowHowTo(true)} aria-label="Nasıl oynanır"
          className="card-btn h-8 w-8 rounded-xl border text-sm font-bold"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
          ?
        </button>
      </div>

      {/* Ekran okuyucu duyurusu */}
      <div aria-live="polite" className="sr-only">{announce}</div>

      <div className="w-full">
        {/* Üst şerit */}
        <div className="rounded-t-xl border px-3 py-1.5 text-center text-xs font-bold uppercase tracking-widest"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-input)', color: 'var(--gold)' }}>
          🕰 En eski (ilk çıkan)
        </div>

        {/* 5 şampiyon kartı */}
        <div className="space-y-2 border-x p-2" style={{ borderColor: 'var(--border)' }}>
          {currentOrder.map((champ, idx) => {
            const isLocked = locked[idx]
            const canMoveUp = idx > 0 && !isLocked && !locked[idx - 1] && !over && !won
            const canMoveDown = idx < currentOrder.length - 1 && !isLocked && !locked[idx + 1] && !over && !won
            const isDragging = draggedIdx === idx
            const isDragOver = dragOverIdx === idx

            return (
              <div key={champ.id}
                draggable={!isLocked && !over && !won}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragLeave={() => setDragOverIdx(null)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={`group flex items-center justify-between rounded-xl border p-2.5 transition-all duration-200 ${
                  !isLocked && !over && !won ? 'cursor-grab active:cursor-grabbing' : ''
                } ${isDragging ? 'opacity-40' : ''} ${isDragOver ? 'scale-[1.02]' : ''} ${!isLocked && shaking ? 'anim-shake' : ''}`}
                style={{
                  borderColor: isDragOver ? 'var(--gold-bright)' : isLocked ? 'var(--correct)' : 'var(--border)',
                  borderStyle: isDragging ? 'dashed' : 'solid',
                  background: isDragOver ? 'rgba(var(--gold-glow-rgb),0.12)' : isLocked ? 'rgba(var(--correct-rgb),0.10)' : 'var(--bg-card)',
                  boxShadow: isDragOver ? '0 4px 16px rgba(var(--gold-glow-rgb),0.2)' : undefined,
                }}>
                {/* Sol: tutamaç (⋮⋮) + portre + ad + yıl durumu */}
                <div className="flex min-w-0 items-center gap-2.5">
                  {!isLocked && !over && !won && (
                    <span className="shrink-0 select-none cursor-grab active:cursor-grabbing text-xs font-bold transition-colors group-hover:!text-[color:var(--gold)]"
                      style={{ color: 'var(--text-dim)' }} title="Sürüklemek için tut">
                      ⋮⋮
                    </span>
                  )}
                  <img src={squareUrl(champ.id)} alt="" loading="lazy"
                    className="h-11 w-11 shrink-0 rounded-lg border object-cover shadow-sm"
                    style={{ borderColor: 'var(--border)' }} />
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {champ.name}
                    </span>
                    {isLocked ? (
                      <span className="mt-0.5 text-xs font-semibold" style={{ color: 'var(--correct)' }}>
                        🔒 {champ.year}
                      </span>
                    ) : over ? (
                      <span className="mt-0.5 block text-xs font-semibold" style={{ color: 'var(--gold)' }}>
                        {champ.year}
                      </span>
                    ) : (
                      <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>Çıkış yılı ?</span>
                    )}
                  </div>
                </div>

                {/* Sağ: ▲▼ */}
                {!isLocked && !over && !won && (
                  <div className="flex shrink-0 flex-col gap-1">
                    <button disabled={!canMoveUp} onClick={() => handleSwap(idx, idx - 1)} aria-label={`${champ.name} yukarı taşı`}
                      className="card-btn flex h-6 w-9 items-center justify-center rounded-md border text-xs font-bold disabled:opacity-30"
                      style={{ borderColor: 'var(--border)', color: 'var(--gold)', background: 'var(--bg-input)' }}>
                      ▲
                    </button>
                    <button disabled={!canMoveDown} onClick={() => handleSwap(idx, idx + 1)} aria-label={`${champ.name} aşağı taşı`}
                      className="card-btn flex h-6 w-9 items-center justify-center rounded-md border text-xs font-bold disabled:opacity-30"
                      style={{ borderColor: 'var(--border)', color: 'var(--gold)', background: 'var(--bg-input)' }}>
                      ▼
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Alt şerit */}
        <div className="rounded-b-xl border px-3 py-1.5 text-center text-xs font-bold uppercase tracking-widest"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-input)', color: 'var(--gold)' }}>
          ✨ En yeni (son çıkan)
        </div>
      </div>

      {/* Alt eylem alanı */}
      {!over && !won && (
        <div className="flex w-full items-center justify-between rounded-xl border p-3"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-dim)' }}>
            <span>Kalan hak:</span>
            <span className="text-sm font-semibold tracking-widest" style={{ color: 'var(--gold)' }}>
              {Array.from({ length: TIMELINE_MAX_ATTEMPTS }, (_, i) => (i < TIMELINE_MAX_ATTEMPTS - attempts ? '◆' : '◇')).join('')}
            </span>
          </div>
          <button onClick={handleCheck} className="btn-gold rounded-xl px-5 py-2.5 text-sm font-bold">
            Sırayı Onayla
          </button>
        </div>
      )}

      {/* Sonuç kartı */}
      {(over || won) && (
        <div className="anim-pop w-full rounded-2xl border p-5 text-center"
          style={{
            borderColor: won ? 'var(--correct)' : 'var(--danger)',
            background: 'var(--bg-card)',
            boxShadow: 'var(--shadow-card)',
          }}>
          <div className="text-4xl">{won ? '🎉' : '😔'}</div>
          <h2 className="font-display mt-2 text-xl font-bold" style={{ color: won ? 'var(--correct)' : 'var(--danger-text)' }}>
            {won ? 'Sırayı buldun!' : 'Bulamadın'}
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>
            {won
              ? `${attempts} denemede tüm şampiyonları doğru sıraladın.`
              : `${TIMELINE_MAX_ATTEMPTS} deneme hakkın bitti — doğru sıralama aşağıda.`}
          </p>

          {/* Doğru sıra */}
          <div className="mt-4 rounded-xl border p-3 text-left"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}>
            <p className="section-label mb-2" style={{ color: 'var(--gold)' }}>Doğru sıralama</p>
            <div className="space-y-1.5">
              {puzzle.target.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2" style={{ color: 'var(--text)' }}>
                    <img src={squareUrl(c.id)} alt="" loading="lazy"
                      className="h-6 w-6 rounded border object-cover" style={{ borderColor: 'var(--border)' }} />
                    <span className="truncate">{c.name}</span>
                  </span>
                  <b style={{ color: 'var(--gold)' }}>{c.year}</b>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={share} className="card-btn flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold"
              style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
              {copied ? '✓ Kopyalandı' : 'Paylaş'}
            </button>
            {!daily && (
              <button onClick={() => startNewGame(puzzle.target.map((c) => c.id))}
                className="btn-gold flex-1 rounded-xl px-4 py-2.5 text-sm font-bold">
                Tekrar Oyna
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
            role="dialog" aria-modal="true" aria-label="Zaman Tüneli kuralları"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-base font-bold" style={{ color: 'var(--gold)' }}>
              🕰️ Zaman Tüneli kuralları
            </h3>
            <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--text-dim)' }}>
              <p>1. 5 şampiyonu çıkış yılına göre eskiden yeniye sırala.</p>
              <p>2. ▲ ▼ butonlarıyla kilitlenmemiş şampiyonların yerini değiştir.</p>
              <p>3. "Sırayı Onayla"ya bastığında doğru pozisyonlar yeşile kilitlenir.</p>
              <p>4. Toplam {TIMELINE_MAX_ATTEMPTS} deneme hakkın var.</p>
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
