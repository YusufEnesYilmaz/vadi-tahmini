import { beforeEach, describe, expect, it } from 'vitest'
import {
  GRID_SIZE,
  MIN_AXIS_POOL,
  MIN_CELL_POOL,
  cellPool,
  checkCell,
  criteriaFromIds,
  dailyGrid,
  loadDailyGrid,
  randomGrid,
  saveDailyGrid,
  solveGrid,
} from './grid'
import { CHAMPIONS } from './data'
import { GRID_DAILY_KEY, miniDailyDone } from './miniDaily'
import { todayKey } from './rng'

describe('grid — üretim kalite kapıları', () => {
  it('eksenler farklı boyuttan, her hücre havuzu yeterli, ızgara çözülebilir', () => {
    // 10 rastgele üretim: kalite kapıları her seferinde tutmalı
    for (let n = 0; n < 10; n++) {
      const p = randomGrid()
      expect(p.rows).toHaveLength(GRID_SIZE)
      expect(p.cols).toHaveLength(GRID_SIZE)
      // Eksen boyutları farklı (id öneki)
      const dim = (id: string) => id.split(':')[0]
      const rowDims = new Set(p.rows.map((r) => dim(r.id)))
      const colDims = new Set(p.cols.map((c) => dim(c.id)))
      expect(rowDims.size).toBe(1)
      expect(colDims.size).toBe(1)
      expect([...rowDims][0]).not.toBe([...colDims][0])
      // Hücre havuzları
      for (const r of p.rows) for (const c of p.cols) {
        expect(cellPool(r, c).length).toBeGreaterThanOrEqual(MIN_CELL_POOL)
      }
      // 9 FARKLI şampiyonla çözülebilir
      const sol = solveGrid(p)
      expect(sol).not.toBeNull()
      expect(new Set(sol!).size).toBe(9)
    }
  })

  it('solveGrid mevcut dolulara saygılı; çözüm hücre kriterlerini sağlar', () => {
    const p = dailyGrid()
    const sol = solveGrid(p)!
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        expect(checkCell(p.rows[r], p.cols[c], sol[r * GRID_SIZE + c])).toBe(true)
      }
    }
    // İlk hücre sabitlenince çözüm o id'yi korur
    const fixed: (string | null)[] = Array(9).fill(null)
    fixed[0] = sol[0]
    expect(solveGrid(p, fixed)![0]).toBe(sol[0])
  })

  it('checkCell yanlış şampiyonu reddeder', () => {
    const p = dailyGrid()
    const pool = cellPool(p.rows[0], p.cols[0])
    const outsider = ['Garen', 'Ahri', 'Teemo', 'Jinx', 'Zed'].find(
      (id) => !pool.some((c) => c.id === id),
    )
    if (outsider) expect(checkCell(p.rows[0], p.cols[0], outsider)).toBe(false)
    expect(checkCell(p.rows[0], p.cols[0], pool[0].id)).toBe(true)
    expect(checkCell(p.rows[0], p.cols[0], 'olmayan-sampiyon')).toBe(false)
  })

  /*
   * Eksen kriterinin havuzu GRID_SIZE'dan küçükse o satır 3 FARKLI şampiyonla
   * doldurulamaz → bulmaca çözümsüz. Filtre olmadan "Makine" (2 şampiyon) gibi
   * minik türler eksen adayı oluyor, üretici de onları eleye eleye kolay
   * boyutlara kayıyordu (ölçüm: Tür ekseni %1'e düşmüştü).
   */
  it('eksen kriterleri çözümsüz satır üretemeyecek kadar geniş', () => {
    expect(MIN_AXIS_POOL).toBeGreaterThanOrEqual(GRID_SIZE)
    for (let n = 0; n < 10; n++) {
      const p = randomGrid()
      for (const k of [...p.rows, ...p.cols]) {
        expect(CHAMPIONS.filter(k.test).length, k.label).toBeGreaterThanOrEqual(MIN_AXIS_POOL)
      }
    }
  })

  it('günlük ızgara deterministik', () => {
    const a = dailyGrid()
    const b = dailyGrid()
    expect(a.rows.map((r) => r.id)).toEqual(b.rows.map((r) => r.id))
    expect(a.cols.map((c) => c.id)).toEqual(b.cols.map((c) => c.id))
  })
})

describe('grid — günlük kayıt', () => {
  beforeEach(() => localStorage.removeItem(GRID_DAILY_KEY))

  it('kayıt gidiş-dönüşü + kriter id çözümü + menü tespiti', () => {
    const p = dailyGrid()
    expect(loadDailyGrid()).toBeNull()
    saveDailyGrid({
      date: todayKey(),
      rowIds: p.rows.map((r) => r.id),
      colIds: p.cols.map((c) => c.id),
      cells: [null, null, null, null, null, null, null, null, null],
      wrong: [[], [], [], [], [], [], [], [], []],
      over: false,
      won: false,
    })
    const back = loadDailyGrid()!
    expect(back.rowIds).toEqual(p.rows.map((r) => r.id))
    expect(criteriaFromIds(back.rowIds)?.map((r) => r.id)).toEqual(back.rowIds)
    expect(miniDailyDone('grid')).toBe(false)
    saveDailyGrid({ ...back, over: true, won: true })
    expect(miniDailyDone('grid')).toBe(true)
  })

  it('bilinmeyen kriter id → kayıt atılır (veri değişti senaryosu)', () => {
    expect(criteriaFromIds(['b:OlmayanBolge'])).toBeNull()
  })
})
