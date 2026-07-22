import { describe, expect, it } from 'vitest'
import { Deck } from './deck'
import { CHAMPIONS, byId } from './data'
import { ayniKoridorVeCinsiyet } from './puzzle'

const pool = Array.from({ length: 20 }, (_, i) => `c${i}`)

describe('deste', () => {
  it('bir tur içinde aynı şampiyonu iki kez vermez', () => {
    // Kullanıcının açık isteği: tekrar hissi olmasın
    const deck = new Deck('test:cycle', pool)
    const drawn = pool.map(() => deck.draw())
    expect(new Set(drawn).size).toBe(pool.length)
  })

  it('deste bitince yeniden karışır ve art arda aynı kartı vermez', () => {
    const deck = new Deck('test:reshuffle', pool)
    const first = pool.map(() => deck.draw())
    const next = deck.draw() // yeni deste başlıyor
    expect(next).not.toBe(first[first.length - 1])
  })

  it('kaldığı yerden devam eder (sayfa yenilense bile)', () => {
    const a = new Deck('test:persist', pool)
    const drawn = [a.draw(), a.draw(), a.draw()]
    // Aynı anahtarla yeni örnek = sayfa yenilenmesi
    const b = new Deck('test:persist', pool)
    const rest = Array.from({ length: pool.length - 3 }, () => b.draw())
    expect(drawn.some((d) => rest.includes(d))).toBe(false)
  })

  it('havuz değişince (yeni patch) deste yeniden kurulur', () => {
    const a = new Deck('test:pool', pool)
    a.draw()
    const bigger = [...pool, 'yeni-sampiyon']
    const b = new Deck('test:pool', bigger)
    const drawn = bigger.map(() => b.draw())
    // Yeni eleman da dağıtıma girmeli, yoksa yeni şampiyon hiç çıkmaz
    expect(drawn).toContain('yeni-sampiyon')
    expect(new Set(drawn).size).toBe(bigger.length)
  })

  it('bozuk kayıt oyunu çökertmez', () => {
    localStorage.setItem('vt:deck:test:broken', '{bozuk json')
    const deck = new Deck('test:broken', pool)
    expect(pool).toContain(deck.draw())
  })
})

describe('ardışık kural (aynı koridor + aynı cinsiyet)', () => {
  it('kural uygulanınca yasak ikili peş peşe gelmez', () => {
    const ids = CHAMPIONS.map((c) => c.id)
    const deck = new Deck('kural:test', ids, ayniKoridorVeCinsiyet)
    const cekilen = ids.map(() => byId(deck.draw())!)
    let ihlal = 0
    for (let i = 1; i < cekilen.length; i++) {
      const a = cekilen[i - 1], b = cekilen[i]
      if (a.gender === b.gender && a.lanes.some((l) => b.lanes.includes(l))) ihlal++
    }
    // Tur sonunda uygun kart kalmayabilir; birkaç kaçak kabul edilir ama yığılma olmamalı
    expect(ihlal).toBeLessThan(5)
  })

  it('kural desteyi bozmaz — her şampiyon tam bir kez gelir', () => {
    const ids = CHAMPIONS.map((c) => c.id)
    const deck = new Deck('kural:permutasyon', ids, ayniKoridorVeCinsiyet)
    const cekilen = ids.map(() => deck.draw())
    expect(new Set(cekilen).size).toBe(ids.length)
  })

  it('kuralsız destede aynı ikili peş peşe gelebiliyor (kural gerçekten iş yapıyor)', () => {
    const ids = CHAMPIONS.map((c) => c.id)
    let toplamIhlal = 0
    for (let t = 0; t < 20; t++) {
      localStorage.clear()
      const deck = new Deck(`kuralsiz${t}`, ids)
      const cekilen = ids.map(() => byId(deck.draw())!)
      for (let i = 1; i < cekilen.length; i++) {
        const a = cekilen[i - 1], b = cekilen[i]
        if (a.gender === b.gender && a.lanes.some((l) => b.lanes.includes(l))) toplamIhlal++
      }
    }
    expect(toplamIhlal).toBeGreaterThan(100) // kuralsızda bol bol oluyor
  })
})
