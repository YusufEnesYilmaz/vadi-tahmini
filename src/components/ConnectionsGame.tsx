import { useEffect, useMemo, useState } from 'react'
import { byId, squareUrl } from '../game/data'
import { copyToClipboard } from '../game/share'
import { playCorrect, playLose, playWin, playWrong } from '../game/sfx'
import { todayKey } from '../game/rng'
import {
  CONN_GROUP_SIZE,
  CONN_MISTAKES,
  dailyConnections,
  evaluateConnGuess,
  loadDailyConnections,
  randomConnections,
  recordConnectionsWin,
  saveDailyConnections,
  type ConnGroup,
  type ConnPuzzle,
} from '../game/connections'
import { evaluateAchievements } from '../game/achievements'
import WinConfetti from './game/WinConfetti'
import GameShell from './game/GameShell'
import { useModalFocusTrap } from './useModalFocusTrap'

interface Props {
  daily?: boolean
  onExit: () => void
}

/** Kademe renkleri — token'lardan (ham renk YOK); paylaşım emojileri aynı sırada */
const TIER_COLORS = ['var(--correct)', 'var(--accent-endless)', 'var(--partial)', 'var(--accent-mystic)']
const TIER_RGB = ['var(--correct-rgb)', 'var(--accent-endless-rgb)', 'var(--partial-rgb)', 'var(--accent-mystic-rgb)']
const TIER_EMOJI = ['🟩', '🟦', '🟨', '🟪']

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Bağlantılar — 16 şampiyonu 4'erli 4 gizli gruba ayır. Doğru grup üstte renkli
 * banda kilitlenir; yanlışta hak yanar ("1 kala" söylenir). Sabit 4 hak (NYT paritesi).
 * İpucu İSTEK ÜZERİNE (2026-07-24): "🔎 İpucu" en kolay çözülmemiş grubun ETİKETİNİ
 * açar, 1 HAK yakar — ön seçmeli zorluk yerine canlı bir tradeoff.
 */
export default function ConnectionsGame({ daily = false, onExit }: Props) {
  const [puzzle, setPuzzle] = useState<ConnPuzzle | null>(null)
  const [board, setBoard] = useState<string[]>([]) // çözülmemiş kartların anlık sırası
  const [solved, setSolved] = useState<ConnGroup[]>([]) // çözülme sırasıyla
  const [selection, setSelection] = useState<string[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [revealed, setRevealed] = useState<string[]>([]) // ipucuyla etiketi açılan grup id'leri
  const [history, setHistory] = useState<string[][]>([])
  const [over, setOver] = useState(false)
  const [won, setWon] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [almostMsg, setAlmostMsg] = useState(false)
  const [showHowTo, setShowHowTo] = useState(false)
  const [copied, setCopied] = useState(false)
  const [announce, setAnnounce] = useState('')
  const howToDialogRef = useModalFocusTrap<HTMLDivElement>(showHowTo)

  // İlk yükleme — günlük deterministik: bulmaca yeniden üretilir, kayıttan yalnız İLERLEME gelir
  useEffect(() => {
    if (daily) {
      const p = dailyConnections()
      const saved = loadDailyConnections()
      if (saved) {
        const solvedGroups = saved.solvedIds
          .map((id) => p.groups.find((g) => g.id === id))
          .filter(Boolean) as ConnGroup[]
        const solvedIds = new Set(solvedGroups.flatMap((g) => g.championIds))
        setPuzzle(p)
        setSolved(solvedGroups)
        setBoard(p.championIds.filter((id) => !solvedIds.has(id)))
        setMistakes(saved.mistakes)
        setRevealed(saved.revealedIds ?? [])
        setHistory(saved.history)
        setOver(saved.over)
        setWon(saved.won)
        return
      }
      setPuzzle(p)
      setBoard(p.championIds)
    } else {
      const p = randomConnections()
      setPuzzle(p)
      setBoard(p.championIds)
    }
  }, [daily])

  useEffect(() => {
    if (!showHowTo) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowHowTo(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showHowTo])

  const selSet = useMemo(() => new Set(selection), [selection])

  const persist = (s: ConnGroup[], h: string[][], m: number, rev: string[], isOver: boolean, isWon: boolean) => {
    if (!daily) return
    saveDailyConnections({
      date: todayKey(),
      solvedIds: s.map((g) => g.id),
      history: h,
      mistakes: m,
      revealedIds: rev,
      over: isOver,
      won: isWon,
    })
  }

  function toggle(id: string) {
    if (over) return
    setAlmostMsg(false)
    setSelection((sel) =>
      sel.includes(id) ? sel.filter((x) => x !== id) : sel.length < CONN_GROUP_SIZE ? [...sel, id] : sel,
    )
  }

  function submit() {
    if (!puzzle || over || selection.length !== CONN_GROUP_SIZE) return
    const res = evaluateConnGuess(puzzle, selection)
    const nextHistory = [...history, selection]
    setHistory(nextHistory)

    if (res.group) {
      const nextSolved = [...solved, res.group]
      const remaining = board.filter((id) => !res.group!.championIds.includes(id))
      const isWon = nextSolved.length === puzzle.groups.length
      setSolved(nextSolved)
      setBoard(remaining)
      setSelection([])
      setAlmostMsg(false)
      setWon(isWon)
      setOver(isWon)
      if (isWon) {
        playWin()
        setAnnounce('Tebrikler! Dört grubu da buldun.')
        // Rozet sayaçları: kusursuz = hiç yanlış onay + hiç ipucu yok
        recordConnectionsWin(mistakes === 0)
        evaluateAchievements()
      } else { playCorrect(); setAnnounce(`Grup bulundu: ${res.group.label}.`) }
      persist(nextSolved, nextHistory, mistakes, revealed, isWon, isWon)
    } else {
      const nextMistakes = mistakes + 1
      const isLost = nextMistakes >= CONN_MISTAKES
      setMistakes(nextMistakes)
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
      setAlmostMsg(res.almost)
      if (isLost) {
        setOver(true)
        setWon(false)
        setSelection([])
        playLose()
        setAnnounce('Hakların bitti — kalan gruplar açıklandı.')
      } else {
        playWrong()
        setAnnounce(res.almost ? "Yanlış — ama 3'ü birlikteydi!" : 'Yanlış dörtlü.')
      }
      persist(solved, nextHistory, nextMistakes, revealed, isLost, false)
    }
  }

  function revealHint() {
    if (!puzzle || over) return
    if (CONN_MISTAKES - mistakes <= 1) return // son hakkını ipucuna harcatma
    const target = [...puzzle.groups]
      .sort((a, b) => a.tier - b.tier)
      .find((g) => !solved.some((s) => s.id === g.id) && !revealed.includes(g.id))
    if (!target) return
    const nextRevealed = [...revealed, target.id]
    const nextMistakes = mistakes + 1
    setRevealed(nextRevealed)
    setMistakes(nextMistakes)
    playWrong()
    setAnnounce(`İpucu: bir grup "${target.label}". 1 hak yandı.`)
    persist(solved, history, nextMistakes, nextRevealed, false, false)
  }

  function newRound() {
    const p = randomConnections()
    setPuzzle(p)
    setBoard(p.championIds)
    setSolved([])
    setSelection([])
    setMistakes(0)
    setRevealed([])
    setHistory([])
    setOver(false)
    setWon(false)
    setAlmostMsg(false)
    setCopied(false)
  }

  async function share() {
    if (!puzzle) return
    const tierOf = (id: string) => puzzle.groups.find((g) => g.championIds.includes(id))?.tier ?? 0
    const rows = history.map((h) => h.map((id) => TIER_EMOJI[tierOf(id)]).join('')).join('\n')
    const hintNote = revealed.length > 0 ? ` 🔎×${revealed.length}` : ''
    const head = won ? `${history.length} onay${hintNote}` : `X${hintNote}`
    const text = `Vadi Tahmini — Bağlantılar${daily ? ` ${todayKey()}` : ''} ${head}\n${rows}`
    if (await copyToClipboard(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!puzzle) return null

  const remaining = CONN_MISTAKES - mistakes
  /** İpucuyla açılmış ama henüz çözülmemiş grup etiketleri (üstte çip) */
  const revealedUnsolved = puzzle.groups.filter((g) => revealed.includes(g.id) && !solved.some((s) => s.id === g.id))
  const canHint = !over && remaining > 1 && puzzle.groups.some((g) => !solved.some((s) => s.id === g.id) && !revealed.includes(g.id))
  /** Kayıpta açıklanacak kalan gruplar (tier sırasıyla) */
  const unsolvedGroups = over && !won ? puzzle.groups.filter((g) => !solved.some((s) => s.id === g.id)) : []

  return (
    <GameShell>
      {won && <WinConfetti />}
      {/* Üst bar */}
      <div className="flex w-full items-center justify-between gap-2 border-b pt-3 pb-2"
        style={{ borderColor: 'var(--border)' }}>
        <button onClick={onExit} className="card-btn rounded-xl border px-3 py-1.5 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
          ← Menü
        </button>
        <span className="font-display font-semibold" style={{ color: 'var(--gold)' }}>
          🧩 Bağlantılar {daily && '· Günlük'}
        </span>
        <button onClick={() => setShowHowTo(true)} aria-label="Nasıl oynanır"
          className="card-btn h-8 w-8 rounded-xl border text-sm font-bold"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
          ?
        </button>
      </div>

      <div aria-live="polite" className="sr-only">{announce}</div>

      <p className="text-center text-xs" style={{ color: 'var(--text-dim)' }}>
        Ortak özelliği paylaşan <b style={{ color: 'var(--text)' }}>4'lü grupları</b> bul — 4 seç, onayla.
      </p>

      {/* Çözülen grup bantları */}
      {solved.length > 0 && (
        <div className="flex w-full flex-col gap-1.5">
          {solved.map((g) => (
            <div key={g.id} className="anim-pop rounded-xl border p-2 text-center"
              style={{ borderColor: TIER_COLORS[g.tier], background: `rgba(${TIER_RGB[g.tier]},0.12)` }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: TIER_COLORS[g.tier] }}>
                {g.label}
              </p>
              <div className="mt-1 flex items-center justify-center gap-2">
                {g.championIds.map((id) => (
                  <span key={id} className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text)' }}>
                    <img src={squareUrl(id)} alt="" loading="lazy"
                      className="h-7 w-7 rounded border object-cover" style={{ borderColor: 'var(--border)' }} />
                    <span className="hidden sm:inline">{byId(id)?.name}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kayıpta kalan gruplar açıklanır (soluk) */}
      {unsolvedGroups.length > 0 && (
        <div className="flex w-full flex-col gap-1.5">
          {unsolvedGroups.map((g) => (
            <div key={g.id} className="rounded-xl border p-2 text-center opacity-70"
              style={{ borderColor: TIER_COLORS[g.tier], background: `rgba(${TIER_RGB[g.tier]},0.08)` }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: TIER_COLORS[g.tier] }}>
                {g.label} <span className="font-normal normal-case" style={{ color: 'var(--text-dim)' }}>· açıklandı</span>
              </p>
              <div className="mt-1 flex items-center justify-center gap-2">
                {g.championIds.map((id) => (
                  <span key={id} className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                    <img src={squareUrl(id)} alt="" loading="lazy"
                      className="h-7 w-7 rounded border object-cover" style={{ borderColor: 'var(--border)' }} />
                    <span className="hidden sm:inline">{byId(id)?.name}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* İpucuyla açılan grup etiketleri (henüz çözülmemiş) */}
      {revealedUnsolved.length > 0 && !over && (
        <div className="flex w-full flex-wrap justify-center gap-1.5">
          {revealedUnsolved.map((g) => (
            <span key={g.id} className="anim-pop rounded-full border px-3 py-1 text-xs font-bold"
              style={{ borderColor: TIER_COLORS[g.tier], color: TIER_COLORS[g.tier], background: `rgba(${TIER_RGB[g.tier]},0.08)` }}>
              🔎 {g.label}
            </span>
          ))}
        </div>
      )}

      {/* 4×4 kart ızgarası */}
      {!over && board.length > 0 && (
        <div className={`grid w-full grid-cols-4 gap-1.5 sm:gap-2 ${shaking ? 'anim-shake' : ''}`}>
          {board.map((id) => {
            const c = byId(id)
            if (!c) return null
            const sel = selSet.has(id)
            return (
              <button key={id} onClick={() => toggle(id)}
                aria-pressed={sel}
                className={`card-btn flex flex-col items-center gap-1 rounded-xl border p-1.5 transition-all ${sel ? 'scale-[0.96]' : ''}`}
                style={{
                  borderColor: sel ? 'var(--gold)' : 'var(--border)',
                  background: sel ? 'rgba(var(--gold-glow-rgb),0.14)' : 'var(--bg-card)',
                  boxShadow: sel ? '0 0 0 2px var(--gold) inset' : undefined,
                }}>
                <img src={squareUrl(id)} alt="" loading="lazy"
                  className="h-12 w-12 rounded-lg border object-cover sm:h-14 sm:w-14"
                  style={{ borderColor: sel ? 'var(--gold)' : 'var(--border)' }} />
                <span className="w-full truncate text-center text-[10px] font-semibold sm:text-[11px]"
                  style={{ color: sel ? 'var(--gold-bright)' : 'var(--text)' }}>
                  {c.name}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* "1 kala" bildirimi */}
      {almostMsg && !over && (
        <p className="anim-pop text-sm font-bold" style={{ color: 'var(--partial)' }}>
          🔥 3'ü birlikteydi — biri yanlış!
        </p>
      )}

      {/* Eylem şeridi */}
      {!over && (
        <div className="flex w-full flex-col gap-2 rounded-xl border p-3"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-dim)' }}>
            <span className="flex items-center gap-1.5">
              Hak:
              <span className="text-sm font-semibold tracking-widest" style={{ color: remaining <= 1 ? 'var(--danger-text)' : 'var(--gold)' }}>
                {Array.from({ length: CONN_MISTAKES }, (_, i) => (i < remaining ? '◆' : '◇')).join('')}
              </span>
            </span>
            <span style={{ color: selection.length === CONN_GROUP_SIZE ? 'var(--gold)' : 'var(--text-dim)' }}>
              {selection.length}/{CONN_GROUP_SIZE} seçili
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setBoard(shuffleArr(board))}
              className="card-btn flex-1 rounded-xl border px-3 py-2 text-xs font-bold"
              style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
              🔀 Karıştır
            </button>
            <button onClick={revealHint} disabled={!canHint}
              className="card-btn flex-1 rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-40"
              style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}
              title={remaining <= 1 ? 'Son hakkını ipucuna harcayamazsın' : 'Bir grubun adını açar · 1 hak yakar'}>
              🔎 İpucu
            </button>
            <button onClick={submit} disabled={selection.length !== CONN_GROUP_SIZE}
              className="btn-gold flex-1 rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-40">
              Onayla
            </button>
          </div>
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
          <div className="text-4xl">{won ? '🎉' : '😔'}</div>
          <h2 className="font-display mt-2 text-xl font-bold" style={{ color: won ? 'var(--correct)' : 'var(--danger-text)' }}>
            {won ? 'Dört grup tamam!' : 'Haklar bitti'}
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>
            {won
              ? `${history.length} onay · ${mistakes} yanlış${revealed.length > 0 ? ` · ${revealed.length} ipucu` : ''}.`
              : 'Kalan gruplar yukarıda açıklandı.'}
          </p>
          <div className="mt-4 flex gap-2">
            <button onClick={share} className="card-btn flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold"
              style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
              {copied ? '✓ Kopyalandı' : 'Paylaş'}
            </button>
            {!daily && (
              <button onClick={newRound} className="btn-gold flex-1 rounded-xl px-4 py-2.5 text-sm font-bold">
                Yeni Bulmaca
              </button>
            )}
          </div>
        </div>
      )}

      {/* Nasıl oynanır */}
      {showHowTo && (
        <div className="ovl fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)' }} onClick={() => setShowHowTo(false)}>
          <div ref={howToDialogRef} className="panel anim-pop w-full max-w-sm rounded-2xl border p-5"
            role="dialog" aria-modal="true" aria-label="Bağlantılar kuralları"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-base font-bold" style={{ color: 'var(--gold)' }}>
              🧩 Bağlantılar kuralları
            </h3>
            <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--text-dim)' }}>
              <p>1. 16 şampiyonun içinde ortak özelliği paylaşan 4 gizli 4'lü grup var.</p>
              <p>2. 4 kart seç, "Onayla" — doğruysa grup renkli banda kilitlenir.</p>
              <p>3. Yanlışta hak yanar ({CONN_MISTAKES} hakkın var); seçtiğin 4'ün 3'ü aynı gruptansa söylenir.</p>
              <p>4. Takılırsan <b style={{ color: 'var(--gold)' }}>🔎 İpucu</b> bir grubun adını açar — ama <b style={{ color: 'var(--text)' }}>1 hak yakar</b>.</p>
              <p>5. Bazı şampiyonlar birden çok gruba uyar gibi görünür — geçerli bölünme TEK.</p>
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
