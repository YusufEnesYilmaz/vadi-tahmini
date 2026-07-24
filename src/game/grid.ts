import { allCriteria, type Criterion } from './bingo'
import { CHAMPIONS } from './data'
import { godMode } from './dev'
import { GRID_DAILY_KEY } from './miniDaily'
import { fnv1a, seededRng, todayKey } from './rng'
import type { Champion } from './types'

/*
 * Dokuz Kare — 3×3 ızgara: satırlar bir kriter boyutundan, sütunlar FARKLI bir
 * boyuttan; hücre = ikisini de sağlayan şampiyon. Her şampiyon oyunda TEK KEZ
 * kullanılabilir (Immaculate Grid kuralı).
 *
 * Kalite kapıları (üretimde doğrulanır, testle kilitli):
 *  1. Her hücrenin kesişim havuzu ≥ MIN_CELL_POOL (dar hücre = çözümsüz hissi).
 *  2. Izgaranın TAMAMI 9 FARKLI şampiyonla doldurulabilir (backtracking eşleme) —
 *     hücre hücre bakınca çözülebilir görünüp bütün olarak çözümsüz kalabilir
 *     (aynı dar havuz iki hücreye ortak olabilir).
 */

export const GRID_SIZE = 3
export const MIN_CELL_POOL = 3

export interface GridPuzzle {
  rows: Criterion[]
  cols: Criterion[]
}

/** Kriterin boyutu id önekinden: b:bölge r:rol k:koridor t:tür kay:kaynak men:menzil yil:yıl */
function dimOf(c: Criterion): string {
  return c.id.split(':')[0]
}

export function cellPool(row: Criterion, col: Criterion): Champion[] {
  return CHAMPIONS.filter((c) => row.test(c) && col.test(c))
}

export function checkCell(row: Criterion, col: Criterion, champId: string): boolean {
  const c = CHAMPIONS.find((x) => x.id === champId)
  return !!c && row.test(c) && col.test(c)
}

/**
 * 9 hücreyi 9 FARKLI şampiyonla doldurmayı dener (backtracking).
 * `fixed`: hâlihazırda dolu hücreler (pes edince mevcut dolulara saygılı örnek
 * çözüm üretmek için). Çözüm yoksa null.
 */
export function solveGrid(puzzle: GridPuzzle, fixed: (string | null)[] = Array(9).fill(null)): string[] | null {
  const pools: string[][] = []
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let cIdx = 0; cIdx < GRID_SIZE; cIdx++) {
      const i = r * GRID_SIZE + cIdx
      if (fixed[i]) {
        pools.push([fixed[i]!])
      } else {
        pools.push(cellPool(puzzle.rows[r], puzzle.cols[cIdx]).map((c) => c.id))
      }
    }
  }
  // En dar havuzdan başla — budama çok daha erken çalışır
  const order = pools.map((_, i) => i).sort((a, b) => pools[a].length - pools[b].length)
  const result: (string | null)[] = Array(9).fill(null)
  const used = new Set<string>()

  function place(k: number): boolean {
    if (k === order.length) return true
    const cell = order[k]
    for (const id of pools[cell]) {
      if (used.has(id)) continue
      used.add(id)
      result[cell] = id
      if (place(k + 1)) return true
      used.delete(id)
      result[cell] = null
    }
    return false
  }

  return place(0) ? (result as string[]) : null
}

/** İki farklı boyuttan 3+3 kriter seçip geçerli ızgara üretir */
function buildGridFromRng(rand: () => number): GridPuzzle {
  const crits = allCriteria()
  const byDim = new Map<string, Criterion[]>()
  for (const c of crits) {
    const d = dimOf(c)
    const list = byDim.get(d) ?? []
    list.push(c)
    byDim.set(d, list)
  }
  // En az 3 kriteri olan boyutlar eksen olabilir
  const dims = [...byDim.keys()].filter((d) => (byDim.get(d) ?? []).length >= GRID_SIZE)

  const shuffled = <T,>(arr: T[]): T[] => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  for (let attempt = 0; attempt < 500; attempt++) {
    const [dRow, dCol] = shuffled(dims)
    if (!dRow || !dCol || dRow === dCol) continue
    const rows = shuffled(byDim.get(dRow)!).slice(0, GRID_SIZE)
    const cols = shuffled(byDim.get(dCol)!).slice(0, GRID_SIZE)

    let ok = true
    for (const r of rows) {
      for (const c of cols) {
        if (cellPool(r, c).length < MIN_CELL_POOL) { ok = false; break }
      }
      if (!ok) break
    }
    if (!ok) continue

    const puzzle: GridPuzzle = { rows, cols }
    if (solveGrid(puzzle)) return puzzle
  }
  // 500 denemede çıkmadıysa veri ciddi değişmiş demektir — test bunu kırmızı yakar.
  throw new Error('Dokuz Kare: geçerli ızgara üretilemedi')
}

/** Günlük ızgara — tarihten deterministik (herkese aynı) */
export function dailyGrid(): GridPuzzle {
  return buildGridFromRng(seededRng(fnv1a(`${todayKey()}:grid`)))
}

/** Sınırsız ızgara */
export function randomGrid(): GridPuzzle {
  return buildGridFromRng(() => Math.random())
}

// ---- Günlük kalıcılık ----

export interface GridDailySave {
  date: string
  rowIds: string[]
  colIds: string[]
  /** 9 hücre — dolu ise şampiyon id'si, boşsa null */
  cells: (string | null)[]
  /** Hücre başına yanlış denenen id'ler */
  wrong: string[][]
  over: boolean
  won: boolean
}

/** id → Criterion (kayıttan ızgarayı geri kurmak için); id çözülmezse null */
export function criteriaFromIds(ids: string[]): Criterion[] | null {
  const all = allCriteria()
  const out: Criterion[] = []
  for (const id of ids) {
    const c = all.find((x) => x.id === id)
    if (!c) return null // veri değişti — kayıt atılır, taze bulmaca
    out.push(c)
  }
  return out
}

export function loadDailyGrid(): GridDailySave | null {
  if (godMode()) return null
  try {
    const raw = localStorage.getItem(GRID_DAILY_KEY)
    if (!raw) return null
    const save = JSON.parse(raw) as GridDailySave
    if (save.date !== todayKey()) return null
    if (!Array.isArray(save.cells) || save.cells.length !== 9) return null
    if (!Array.isArray(save.wrong) || save.wrong.length !== 9) return null
    return save
  } catch {
    return null
  }
}

export function saveDailyGrid(save: GridDailySave): void {
  try {
    localStorage.setItem(GRID_DAILY_KEY, JSON.stringify(save))
  } catch {
    // localStorage kapalı olabilir
  }
}

/** Galibiyet sayacı (+ hiç yanlışsız "kusursuz" sayacı) — rozetler okur */
export function recordGridWin(perfect: boolean) {
  localStorage.setItem('vt:grid:wins', String(Number(localStorage.getItem('vt:grid:wins') ?? 0) + 1))
  if (perfect) {
    localStorage.setItem('vt:grid:perfect', String(Number(localStorage.getItem('vt:grid:perfect') ?? 0) + 1))
  }
}
