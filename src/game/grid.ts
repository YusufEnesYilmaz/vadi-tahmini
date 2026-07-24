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

/**
 * Bir kriterin EKSEN olabilmesi için gereken en küçük şampiyon havuzu.
 * Alt sınır aslında GRID_SIZE (3 hücre = 3 FARKLI şampiyon; "Makine" 2 kişiyle
 * satır matematiksel olarak çözümsüz); 8 ise kesişimlere pay bırakan kalite marjı.
 * Bu filtre olmadan Tür ekseni fiilen ölüydü: 17 tür kriterinin çoğu minik olduğu
 * için rastgele 3'lü seçim neredeyse hep çözümsüz çıkıyor, üretici de kolay
 * boyutlara kayıyordu (ölçüm: Tür %1, Nesil %82).
 */
export const MIN_AXIS_POOL = 8

export interface GridPuzzle {
  rows: Criterion[]
  cols: Criterion[]
}

/** Kriterin boyutu id önekinden: b:bölge r:rol k:koridor t:tür kay:kaynak men:menzil nesil:dönem */
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
  // Yalnız eksen olmaya yetecek havuzu olan kriterler — çözümsüz satır üretmesin
  const crits = allCriteria().filter((k) => CHAMPIONS.filter(k.test).length >= MIN_AXIS_POOL)
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

  for (let attempt = 0; attempt < 200; attempt++) {
    const [dRow, dCol] = shuffled(dims)
    if (!dRow || !dCol || dRow === dCol) continue

    /*
     * Seçilen eksen ÇİFTİ için birkaç kriter örneklemesi denenir — tek örnekleme
     * deneyip hemen yeni çifte geçmek "kolay" boyutları haksız kayırıyor: geniş
     * havuzlu bir boyut (nesil 90/44/39) kalite kapılarını neredeyse hep ilk
     * geçtiği için ızgaraların %98'ini kapıyordu (ölçüldü). Her çifte gerçek bir
     * şans verilince dağılım boyutlar arasında dengeleniyor.
     */
    for (let sample = 0; sample < 12; sample++) {
      const rows = shuffled(byDim.get(dRow)!).slice(0, GRID_SIZE)

      /*
       * Sütunlar rastgele DEĞİL, seçili satırların HEPSİYLE uyumlu (kesişimi
       * ≥ MIN_CELL_POOL) adaylardan seçilir. Sütunu da körlemesine seçmek 9 hücrenin
       * birden tutmasını düşük olasılık yapıyor ve zor çiftler (Bölge×Tür, Rol×Tür)
       * hiç üretilemiyordu; böyle seçilince hücre kapısı YAPISAL olarak sağlanıyor,
       * geriye yalnız "9 farklı şampiyon" kapısı (solveGrid) kalıyor.
       */
      const cols: Criterion[] = []
      for (const c of shuffled(byDim.get(dCol)!)) {
        if (rows.every((r) => cellPool(r, c).length >= MIN_CELL_POOL)) cols.push(c)
        if (cols.length === GRID_SIZE) break
      }
      if (cols.length < GRID_SIZE) continue

      const puzzle: GridPuzzle = { rows, cols }
      if (solveGrid(puzzle)) return puzzle
    }
  }
  // 200 eksen çifti × 12 örnekleme boşa çıktıysa veri ciddi değişmiş demektir — test kırmızı yakar.
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
