import { beforeEach, describe, expect, it } from 'vitest'
import {
  CONN_GROUP_COUNT,
  CONN_GROUP_SIZE,
  connCriteria,
  countPartitions,
  dailyConnections,
  evaluateConnGuess,
  loadDailyConnections,
  randomConnections,
  saveDailyConnections,
} from './connections'
import { CHAMPIONS } from './data'
import { CONN_DAILY_KEY, miniDailyDone } from './miniDaily'
import { todayKey } from './rng'

describe('connections — üretim kalite kapıları', () => {
  it('16 benzersiz şampiyon; her grup kendi kriterini TAM sağlar; TEK çözüm; tuzak var', () => {
    const crits = connCriteria()
    // 5 rastgele üretim — kapılar her seferinde tutmalı
    for (let n = 0; n < 5; n++) {
      const p = randomConnections()
      expect(p.groups).toHaveLength(CONN_GROUP_COUNT)
      const allIds = p.groups.flatMap((g) => g.championIds)
      expect(new Set(allIds).size).toBe(CONN_GROUP_COUNT * CONN_GROUP_SIZE)
      expect([...p.championIds].sort()).toEqual([...allIds].sort())

      const critOf = (id: string) => crits.find((k) => k.id === id)!
      for (const g of p.groups) {
        const k = critOf(g.id)
        expect(k, `kriter bulunamadı: ${g.id}`).toBeTruthy()
        for (const cid of g.championIds) {
          const ch = CHAMPIONS.find((c) => c.id === cid)!
          expect(k.test(ch), `${cid} "${g.label}" kriterini sağlamıyor`).toBe(true)
        }
      }

      // TEK çözüm (üreticinin kapısı — burada bağımsız yeniden doğrulanır)
      expect(countPartitions(p.groups.map((g) => critOf(g.id)), allIds)).toBe(1)

      // Tuzak: en az 2 şampiyon başka grubun kriterine de uyuyor
      let cross = 0
      for (const g of p.groups) {
        for (const cid of g.championIds) {
          const ch = CHAMPIONS.find((c) => c.id === cid)!
          if (p.groups.some((o) => o.id !== g.id && critOf(o.id).test(ch))) cross++
        }
      }
      expect(cross).toBeGreaterThanOrEqual(2)

      // Kademeler 0-3 ve benzersiz
      expect([...p.groups.map((g) => g.tier)].sort()).toEqual([0, 1, 2, 3])
    }
  })

  it('countPartitions ikinci çözümü görünce keser (çakışan yapay senaryo)', () => {
    // Yapay: iki AYNI kriter (herkes ikisine de uyar) → bölünme sayısı >1 → 2'de kesilir
    const anyChamps = CHAMPIONS.slice(0, 8).map((c) => c.id)
    const always = { id: 'x:1', label: 'x', test: () => true }
    const always2 = { id: 'x:2', label: 'x', test: () => true }
    expect(countPartitions([always, always2], anyChamps)).toBe(2) // erken kesildi (gerçekte çok daha fazla)
  })

  it('günlük bulmaca deterministik', () => {
    const a = dailyConnections()
    const b = dailyConnections()
    expect(a.groups.map((g) => g.id)).toEqual(b.groups.map((g) => g.id))
    expect(a.championIds).toEqual(b.championIds)
  })
})

describe('connections — tahmin değerlendirme', () => {
  it('tam grup bulunur; "1 kala" tespit edilir', () => {
    const p = dailyConnections()
    const g0 = p.groups[0]
    expect(evaluateConnGuess(p, g0.championIds).group?.id).toBe(g0.id)
    // 3 doğru + başka gruptan 1 → almost
    const foreign = p.groups[1].championIds[0]
    const almostPick = [...g0.championIds.slice(0, 3), foreign]
    const res = evaluateConnGuess(p, almostPick)
    expect(res.group).toBeNull()
    expect(res.almost).toBe(true)
    // 2+2 karışım → almost değil
    const mixed = [...g0.championIds.slice(0, 2), ...p.groups[1].championIds.slice(0, 2)]
    expect(evaluateConnGuess(p, mixed).almost).toBe(false)
  })
})

describe('connections — günlük kayıt', () => {
  beforeEach(() => localStorage.removeItem(CONN_DAILY_KEY))

  it('gidiş-dönüş + menü tespiti + eski tarih reddi', () => {
    expect(loadDailyConnections()).toBeNull()
    saveDailyConnections({ date: todayKey(), solvedIds: ['b:Noxus'], history: [['Darius', 'Swain', 'Talon', 'Katarina']], mistakes: 1, over: false, won: false })
    expect(loadDailyConnections()?.solvedIds).toEqual(['b:Noxus'])
    expect(miniDailyDone('connections')).toBe(false)
    saveDailyConnections({ date: todayKey(), solvedIds: [], history: [], mistakes: 4, over: true, won: false })
    expect(miniDailyDone('connections')).toBe(true) // kayıp da "bugün oynandı bitti"dir
    saveDailyConnections({ date: '2020-01-01', solvedIds: [], history: [], mistakes: 0, over: true, won: true })
    expect(loadDailyConnections()).toBeNull()
  })
})
