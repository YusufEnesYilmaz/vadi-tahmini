import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { CHAMPIONS, byId, squareUrl } from '../game/data'
import { copyToClipboard } from '../game/share'
import { playCorrect, playLose, playWin, playWrong } from '../game/sfx'
import { todayKey } from '../game/rng'
import {
  GRID_SIZE,
  cellPool,
  checkCell,
  criteriaFromIds,
  dailyGrid,
  loadDailyGrid,
  randomGrid,
  recordGridWin,
  saveDailyGrid,
  solveGrid,
  type GridPuzzle,
} from '../game/grid'
import { evaluateAchievements } from '../game/achievements'
import Autocomplete, { type AcOption } from './Autocomplete'
import ExitConfirm from './ExitConfirm'
import WinConfetti from './game/WinConfetti'
import GameShell from './game/GameShell'
import { useModalFocusTrap } from './useModalFocusTrap'

interface Props {
  daily?: boolean
  onExit: () => void
}

const EMPTY_CELLS: (string | null)[] = Array(9).fill(null)
const EMPTY_WRONG: string[][] = Array.from({ length: 9 }, () => [])

/**
 * Dokuz Kare — 3×3; satır × sütun kriterlerini sağlayan 9 FARKLI şampiyonu yerleştir.
 * lolchallenge'dan bilinçli sapma: hücre SEÇ → Autocomplete (hangi hücreye uyduğunu
 * düşünmek oyunun özü; tek global inputun otomatik yerleştirmesi onu çalardı).
 */
export default function GridGame({ daily = false, onExit }: Props) {
  const sessionDate = useRef(todayKey()).current
  const [puzzle, setPuzzle] = useState<GridPuzzle | null>(null)
  const [cells, setCells] = useState<(string | null)[]>(EMPTY_CELLS)
  const [wrong, setWrong] = useState<string[][]>(EMPTY_WRONG)
  const [selected, setSelected] = useState<number | null>(null)
  const [over, setOver] = useState(false)
  const [won, setWon] = useState(false)
  const [reveal, setReveal] = useState<string[] | null>(null) // pes: örnek çözüm
  const [confirmSurrender, setConfirmSurrender] = useState(false)
  const [shakeCell, setShakeCell] = useState<number | null>(null)
  const [showHowTo, setShowHowTo] = useState(false)
  const [copied, setCopied] = useState(false)
  const [announce, setAnnounce] = useState('')
  const howToDialogRef = useModalFocusTrap<HTMLDivElement>(showHowTo)

  // İlk yükleme: günlükte kayıt varsa geri kur (kriter id çözülmezse taze bulmaca)
  useEffect(() => {
    if (daily) {
      const saved = loadDailyGrid()
      if (saved) {
        const rows = criteriaFromIds(saved.rowIds)
        const cols = criteriaFromIds(saved.colIds)
        if (rows && cols) {
          setPuzzle({ rows, cols })
          setCells(saved.cells)
          setWrong(saved.wrong)
          setOver(saved.over)
          setWon(saved.won)
          return
        }
      }
      setPuzzle(dailyGrid())
    } else {
      setPuzzle(randomGrid())
    }
  }, [daily])

  // Escape: önce modal, sonra hücre seçimi
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (showHowTo) setShowHowTo(false)
      else if (selected !== null) setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showHowTo, selected])

  const filledCount = cells.filter(Boolean).length
  const usedSet = useMemo(() => new Set(cells.filter(Boolean) as string[]), [cells])

  const options: AcOption[] = useMemo(
    () => CHAMPIONS.map((c) => ({ key: c.id, label: c.name, img: squareUrl(c.id) })),
    [],
  )
  // Kullanılanlar + seçili hücrede yanlış denenenler kapalı
  const disabledKeys = useMemo(() => {
    const s = new Set(usedSet)
    if (selected !== null) for (const id of wrong[selected]) s.add(id)
    return s
  }, [usedSet, wrong, selected])

  const persist = (nextCells: (string | null)[], nextWrong: string[][], isOver: boolean, isWon: boolean) => {
    if (!daily || !puzzle) return
    saveDailyGrid({
      date: sessionDate,
      rowIds: puzzle.rows.map((r) => r.id),
      colIds: puzzle.cols.map((c) => c.id),
      cells: nextCells,
      wrong: nextWrong,
      over: isOver,
      won: isWon,
    })
  }

  function pick(champId: string) {
    if (!puzzle || selected === null || over) return
    const r = Math.floor(selected / GRID_SIZE)
    const c = selected % GRID_SIZE
    if (checkCell(puzzle.rows[r], puzzle.cols[c], champId)) {
      const nextCells = [...cells]
      nextCells[selected] = champId
      const isWon = nextCells.every(Boolean)
      setCells(nextCells)
      setSelected(null)
      setWon(isWon)
      setOver(isWon)
      if (isWon) {
        playWin()
        setAnnounce('Tebrikler! Dokuz kareyi de doldurdun.')
        // Rozet sayaçları: kusursuz = hiç yanlış deneme yapılmadı (tüm hücreler toplamı)
        recordGridWin(wrong.reduce((n, l) => n + l.length, 0) === 0)
        evaluateAchievements()
      } else {
        playCorrect()
        setAnnounce(`${byId(champId)?.name} yerleşti. ${nextCells.filter(Boolean).length}/9.`)
      }
      persist(nextCells, wrong, isWon, isWon)
    } else {
      const nextWrong = wrong.map((list, i) => (i === selected ? [...list, champId] : list))
      setWrong(nextWrong)
      setShakeCell(selected)
      setTimeout(() => setShakeCell(null), 500)
      playWrong()
      setAnnounce(`${byId(champId)?.name} bu hücreye uymuyor.`)
      persist(cells, nextWrong, false, false)
    }
  }

  function surrender() {
    if (!puzzle) return
    setConfirmSurrender(false)
    setOver(true)
    setWon(false)
    // Mevcut dolulara saygılı örnek çözüm; onlarla çözüm kalmadıysa boştan üret
    const sol = solveGrid(puzzle, cells) ?? solveGrid(puzzle)
    setReveal(sol)
    playLose()
    persist(cells, wrong, true, false)
  }

  function newRound() {
    setPuzzle(randomGrid())
    setCells(EMPTY_CELLS)
    setWrong(EMPTY_WRONG.map(() => []))
    setSelected(null)
    setOver(false)
    setWon(false)
    setReveal(null)
    setCopied(false)
  }

  async function share() {
    const totalWrong = wrong.reduce((n, list) => n + list.length, 0)
    const head = won ? `9/9 · ${totalWrong} yanlış` : `${filledCount}/9`
    const grid = [0, 1, 2].map((r) =>
      [0, 1, 2].map((c) => (cells[r * GRID_SIZE + c] ? '🟩' : '⬛')).join('')).join('\n')
    const text = `Vadi Tahmini — Dokuz Kare${daily ? ` ${todayKey()}` : ''} ${head}\n${grid}`
    if (await copyToClipboard(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!puzzle) return null

  const selLabel = selected !== null
    ? `${puzzle.rows[Math.floor(selected / GRID_SIZE)].label} × ${puzzle.cols[selected % GRID_SIZE].label}`
    : null

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
          🔲 Dokuz Kare {daily && '· Günlük'}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{filledCount}/9</span>
          <button onClick={() => setShowHowTo(true)} aria-label="Nasıl oynanır"
            className="card-btn h-8 w-8 rounded-xl border text-sm font-bold"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            ?
          </button>
        </div>
      </div>

      <div aria-live="polite" className="sr-only">{announce}</div>

      {/* İlerleme çubuğu */}
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-input)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(filledCount / 9) * 100}%`, background: 'linear-gradient(90deg, var(--gold), var(--gold-bright))' }} />
      </div>

      {/* Izgara: köşe + sütun başlıkları / satır başlığı + hücreler */}
      <div className="grid w-full gap-1.5 sm:gap-2" style={{ gridTemplateColumns: 'minmax(58px,0.7fr) repeat(3, 1fr)' }}>
        {/* Köşe rozeti */}
        <div className="flex items-center justify-center">
          <span className="grid h-8 w-8 place-items-center rounded-lg text-sm shadow-inner" style={{ background: 'rgba(var(--gold-glow-rgb),0.10)' }}>🔲</span>
        </div>
        {puzzle.cols.map((c) => (
          <div key={c.id} className="flex items-center justify-center">
            <span className="w-full truncate rounded-lg border px-1 py-1.5 text-center text-[10px] font-bold uppercase leading-tight tracking-wide sm:text-[11px]"
              style={{ borderColor: 'rgba(var(--gold-glow-rgb),0.25)', background: 'rgba(var(--gold-glow-rgb),0.06)', color: 'var(--gold)' }} title={c.label}>
              {c.label}
            </span>
          </div>
        ))}
        {puzzle.rows.map((row, r) => (
          <Fragment key={row.id}>
            <div className="flex items-center justify-center">
              <span className="w-full truncate rounded-lg border px-1 py-1.5 text-center text-[10px] font-bold uppercase leading-tight tracking-wide sm:text-[11px]"
                style={{ borderColor: 'rgba(var(--gold-glow-rgb),0.25)', background: 'rgba(var(--gold-glow-rgb),0.06)', color: 'var(--gold)' }} title={row.label}>
                {row.label}
              </span>
            </div>
            {puzzle.cols.map((col, c) => {
              const i = r * GRID_SIZE + c
              const id = cells[i] ?? reveal?.[i] ?? null
              const isRevealed = !cells[i] && !!reveal?.[i]
              const champ = id ? byId(id) : null
              const isSel = selected === i
              const isEmpty = !cells[i] && !isRevealed
              return (
                <button key={col.id} disabled={!!cells[i] || over}
                  onClick={() => setSelected(isSel ? null : i)}
                  aria-label={`${row.label} × ${col.label} hücresi${champ ? ` — ${champ.name}` : ''}`}
                  className={`card-btn relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border p-1 transition-all ${shakeCell === i ? 'anim-shake' : ''} ${cells[i] ? 'anim-pop' : ''}`}
                  style={{
                    borderColor: isSel ? 'var(--gold)' : cells[i] ? 'var(--correct)' : 'var(--border)',
                    borderStyle: isEmpty && !isSel ? 'dashed' : 'solid',
                    background: isSel
                      ? 'rgba(var(--gold-glow-rgb),0.12)'
                      : cells[i] ? 'rgba(var(--correct-rgb),0.10)' : 'var(--bg-card)',
                    boxShadow: isSel ? '0 0 0 2px var(--gold) inset, 0 4px 16px rgba(var(--gold-glow-rgb),0.2)' : undefined,
                    opacity: isRevealed ? 0.55 : 1,
                  }}>
                  {champ ? (
                    <>
                      <img src={squareUrl(champ.id)} alt="" loading="lazy"
                        className="h-2/3 w-auto rounded-lg border object-cover shadow-sm"
                        style={{ borderColor: cells[i] ? 'var(--correct)' : 'var(--border)' }} />
                      <span className="mt-1 w-full truncate px-0.5 text-center text-[10px] font-semibold sm:text-[11px]"
                        style={{ color: isRevealed ? 'var(--text-dim)' : 'var(--text)' }}>
                        {champ.name}
                      </span>
                      {isRevealed && <span className="text-[9px]" style={{ color: 'var(--text-dim)' }}>örnek</span>}
                    </>
                  ) : (
                    <span className="grid h-8 w-8 place-items-center rounded-full text-xl font-bold transition-transform group-hover:scale-110"
                      style={{
                        color: isSel ? 'var(--gold)' : 'var(--text-dim)',
                        background: isSel ? 'rgba(var(--gold-glow-rgb),0.18)' : 'rgba(255,255,255,0.03)',
                      }}>
                      +
                    </span>
                  )}
                  {wrong[i].length > 0 && !cells[i] && !over && (
                    <span className="absolute right-1 top-1 rounded px-1 text-[9px] font-bold"
                      style={{ color: 'var(--danger-text)', background: 'rgba(0,0,0,0.35)' }}>
                      {wrong[i].length}✗
                    </span>
                  )}
                </button>
              )
            })}
          </Fragment>
        ))}
      </div>

      {/* Seçili hücre + giriş */}
      {!over && selected !== null && (
        <div className="anim-pop w-full rounded-xl border p-3"
          style={{ borderColor: 'var(--gold)', background: 'var(--bg-card)' }}>
          <p className="mb-2 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
            Seçili hücre: <b style={{ color: 'var(--gold)' }}>{selLabel}</b>
            {wrong[selected].length > 0 && (
              <span style={{ color: 'var(--danger-text)' }}> · {wrong[selected].length} yanlış deneme</span>
            )}
          </p>
          <Autocomplete options={options} placeholder="İki kriteri de sağlayan şampiyonu yaz..."
            disabledKeys={disabledKeys} onPick={pick} autoFocus />
          {wrong[selected].length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {wrong[selected].map((id) => (
                <span key={id} className="rounded-md border px-1.5 py-0.5 text-[10px]"
                  style={{ borderColor: 'var(--danger)', color: 'var(--danger-text)' }}>
                  {byId(id)?.name ?? id}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {!over && selected === null && (
        <p className="text-center text-xs" style={{ color: 'var(--text-dim)' }}>
          Bir hücreye dokun → satır ve sütun kriterini birden sağlayan şampiyonu yaz.
          Her şampiyon <b style={{ color: 'var(--text)' }}>yalnız bir hücrede</b> kullanılabilir; yanlışın cezası yok.
        </p>
      )}

      {/* Pes */}
      {!over && (
        <button onClick={() => setConfirmSurrender(true)}
          className="card-btn rounded-xl border px-4 py-2 text-xs font-semibold"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
          🏳️ Pes et — çözümü gör
        </button>
      )}

      {/* Sonuç kartı */}
      {over && (
        <div className="anim-pop w-full rounded-2xl border p-5 text-center"
          style={{
            borderColor: won ? 'var(--correct)' : 'var(--danger)',
            background: 'var(--bg-card)',
            boxShadow: 'var(--shadow-card)',
          }}>
          <div className="text-4xl">{won ? '🎉' : '🏳️'}</div>
          <h2 className="font-display mt-2 text-xl font-bold" style={{ color: won ? 'var(--correct)' : 'var(--danger-text)' }}>
            {won ? 'Dokuz kare tamam!' : 'Pes ettin'}
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>
            {won
              ? `Toplam ${wrong.reduce((n, l) => n + l.length, 0)} yanlış denemeyle doldurdun.`
              : 'Soluk kartlar örnek bir çözüm — başka kombinasyonlar da vardı.'}
          </p>

          {/* Her hücrede kaç alternatif vardı (havuz zaten elimizde — merak giderme) */}
          <div className="mt-4 rounded-xl border p-3 text-left"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}>
            <p className="section-label mb-2" style={{ color: 'var(--gold)' }}>Hücre başına kaç şampiyon uyuyordu?</p>
            <div className="grid grid-cols-3 gap-1 text-center">
              {puzzle.rows.flatMap((row) =>
                puzzle.cols.map((col) => (
                  <div key={`${row.id}:${col.id}`} className="rounded-lg border px-1 py-1.5 text-[10px]"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
                    <b style={{ color: 'var(--gold)' }}>{cellPool(row, col).length}</b>
                    <span className="block truncate">{row.label}×{col.label}</span>
                  </div>
                )),
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={share} className="card-btn flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold"
              style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
              {copied ? '✓ Kopyalandı' : 'Paylaş'}
            </button>
            {!daily && (
              <button onClick={newRound} className="btn-gold flex-1 rounded-xl px-4 py-2.5 text-sm font-bold">
                Yeni Izgara
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pes onayı — tema uyumlu ortak modal */}
      {confirmSurrender && (
        <ExitConfirm title="Pes mi?" stayLabel="Oynamaya devam" leaveLabel="Pes et"
          onStay={() => setConfirmSurrender(false)} onLeave={surrender}>
          Çözüm açıklanır ve {daily ? 'bugünün günlüğü kaybedilmiş sayılır' : 'bu ızgara kapanır'}.
        </ExitConfirm>
      )}

      {/* Nasıl oynanır */}
      {showHowTo && (
        <div className="ovl fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)' }} onClick={() => setShowHowTo(false)}>
          <div ref={howToDialogRef} className="panel anim-pop w-full max-w-sm rounded-2xl border p-5"
            role="dialog" aria-modal="true" aria-label="Dokuz Kare kuralları"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-base font-bold" style={{ color: 'var(--gold)' }}>
              🔲 Dokuz Kare kuralları
            </h3>
            <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--text-dim)' }}>
              <p>1. Her hücre, satır VE sütun kriterini birden sağlayan bir şampiyon ister.</p>
              <p>2. Hücreye dokun, şampiyonu yaz — doğruysa yerleşir.</p>
              <p>3. Her şampiyon yalnız BİR hücrede kullanılabilir.</p>
              <p>4. Yanlış denemenin cezası yok; hücrede kırmızı birikir.</p>
              <p>5. Süre yok — 9 kareyi doldurunca kazanırsın.</p>
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
