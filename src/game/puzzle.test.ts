import { describe, expect, it } from 'vitest'
import { CHAMPIONS, EMOJI, EMOJI_IDS } from './data'
import { createTimedStream, DAILY_OVERRIDES, nextPuzzle } from './puzzle'
import { resetDecks } from './deck'
import { todayKey } from './rng'
import { asChamp, champOf } from '../test/helpers'
import { SUB_MODES } from './types'

describe('bulmaca üretimi', () => {
  it('Günlük aynı gün içinde hep aynı cevabı verir', () => {
    // Arkadaşların skorlarını karşılaştırabilmesi buna bağlı
    const a = nextPuzzle('daily', 'classic')
    const b = nextPuzzle('daily', 'classic')
    expect(champOf(a).id).toBe(champOf(b).id)
  })

  it('Günlük alt modları birbirinden farklı bulmaca verir', () => {
    const ids = (['classic', 'ability', 'splash', 'emoji'] as const).map((s) => champOf(nextPuzzle('daily', s)).id)
    expect(new Set(ids).size).toBeGreaterThan(1)
  })

  it('Günlük ek rastgelelik de deterministik (yetenek, kırpma, kostüm)', () => {
    const a = asChamp(nextPuzzle('daily', 'ability'))
    const b = asChamp(nextPuzzle('daily', 'ability'))
    expect(a.spellIndex).toBe(b.spellIndex)

    const c = asChamp(nextPuzzle('daily', 'splash'))
    const d = asChamp(nextPuzzle('daily', 'splash'))
    expect(c.crop).toEqual(d.crop)
    expect(c.splashNum).toBe(d.splashNum)
  })

  it('Bugün için elle sabitlenmiş görsel bulmaca varsa uygulanır (yoksa atlanır)', () => {
    // Zaman bombası olmasın: override yalnız kendi tarihinde aktif, sonrasında bu test koşulsuz geçer
    const ov = DAILY_OVERRIDES[todayKey()]?.splash
    if (ov) {
      const p = asChamp(nextPuzzle('daily', 'splash'))
      expect(p.champion.id).toBe(ov.id)
      expect(p.splashNum).toBe(ov.splashNum)
    }
  })

  it('Emoji modu yalnız emoji verisi olan şampiyonları seçer', () => {
    for (let i = 0; i < 30; i++) {
      const p = nextPuzzle('endless', 'emoji')
      expect(EMOJI[champOf(p).id]?.length).toBeGreaterThan(0)
    }
  })

  it('bütün şampiyonların emojisi var (yeni şampiyon eklenince bu test uyarır)', () => {
    const eksik = CHAMPIONS.filter((c) => !EMOJI[c.id]?.length).map((c) => c.name)
    expect(eksik, `emoji verisi eksik: ${eksik.join(', ')}`).toEqual([])
    expect(EMOJI_IDS.length).toBe(CHAMPIONS.length)
  })

  it('yetenek modunda tuş indeksi geçerli aralıkta (0=Pasif, 1-4=QWER)', () => {
    for (let i = 0; i < 30; i++) {
      const p = asChamp(nextPuzzle('endless', 'ability'))
      expect(p.spellIndex).toBeGreaterThanOrEqual(0)
      expect(p.spellIndex).toBeLessThanOrEqual(4)
    }
  })

  it('kostüm modunda hedef kostüm gerçekten o şampiyona ait', () => {
    for (let i = 0; i < 20; i++) {
      const p = asChamp(nextPuzzle('endless', 'skin'))
      expect(p.champion.skins.some((s) => s.num === p.skin?.num)).toBe(true)
    }
  })

  it('Karışık (Zamana Karşı): Klasik ASLA gelmez, diğer tipler gelir', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) seen.add(nextPuzzle('timed', 'mix').sub)
    expect(seen.has('classic')).toBe(false)
    // Havuzdaki tiplerden çeşitlilik olmalı (istatistiksel olarak neredeyse kesin)
    expect(seen.size).toBeGreaterThan(2)
  })

  it('Karışık (Sınırsız): Klasik dahil altı tip de gelebilir', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 300; i++) seen.add(nextPuzzle('endless', 'mix').sub)
    expect(seen.has('classic')).toBe(true)
  })

  it('Karışık her zaman geçerli, tam bir bulmaca üretir', () => {
    for (let i = 0; i < 60; i++) {
      const p = nextPuzzle('endless', 'mix')
      // Eşya bulmacasında şampiyon yok — her dalın kendi cevabı dolu olmalı
      expect(p.sub === 'item' ? p.item : p.champion).toBeTruthy()
      // Liste elle yazılmıyor: yeni alt mod eklenince test kendiliğinden kapsar
      expect(SUB_MODES.map((m) => m.id)).toContain(p.sub)
    }
  })

  it('Eşya modu geçerli bir eşya verir ve tekrar etmez', () => {
    // Taze deste ŞART: bu dosyadaki Karışık testleri (300 + 200 + 60 çekiliş)
    // eşya destesinin bir kısmını tüketiyor. Havuz 143'ken kalan pay 40 çekilişe
    // yetiyordu, 109'a inince marj ~4'e düştü ve test rastgele kırmızı yanmaya
    // başladı. Testin ölçtüğü şey "bir tur içinde tekrar yok" — komşu testlerin
    // ne kadar çektiği değil.
    resetDecks()
    const seen = new Set<string>()
    for (let i = 0; i < 40; i++) {
      const p = nextPuzzle('endless', 'item')
      expect(p.sub).toBe('item')
      if (p.sub !== 'item') continue
      expect(p.item.name.length).toBeGreaterThan(0)
      expect(p.item.gold).toBeGreaterThanOrEqual(1600)
      expect(seen.has(p.item.id)).toBe(false) // deste: tur içi tekrar yok
      seen.add(p.item.id)
    }
  })

  it('Günlük Eşya herkese aynı gelir', () => {
    const a = nextPuzzle('daily', 'item')
    const b = nextPuzzle('daily', 'item')
    expect(a).toEqual(b)
  })
})

/*
 * Zamana Karşı'nın seed'li akışı. Eskiden challenge.test.ts'teydi; link tabanlı
 * meydan okuma kaldırılınca (Faz 1b, 2026-07-24) buraya taşındı — akış hâlâ
 * Zamana Karşı'nın temeli, testleri özellikle kaybolmamalıydı.
 */
describe('Zamana Karşı seed akışı (createTimedStream)', () => {
  it('aynı seed → birebir aynı soru dizisi', () => {
    const a = createTimedStream(123456, 'mix')
    const b = createTimedStream(123456, 'mix')
    for (let i = 0; i < 15; i++) {
      const pa = a.next()
      const pb = b.next()
      expect(pa.sub).toBe(pb.sub)
      // Tüm alanlarıyla karşılaştır: eşya/şampiyon dalı fark etmeksizin birebir aynı olmalı
      expect(pa).toEqual(pb)
    }
  })

  it('farklı seed → farklı dizi (neredeyse kesin)', () => {
    const a = createTimedStream(1, 'ability')
    const b = createTimedStream(2, 'ability')
    const seqA = Array.from({ length: 10 }, () => champOf(a.next()).id)
    const seqB = Array.from({ length: 10 }, () => champOf(b.next()).id)
    expect(seqA).not.toEqual(seqB)
  })

  it('akış Zamana Karşı Karışık kurallarına uyar (Klasik yok)', () => {
    const s = createTimedStream(999, 'mix')
    for (let i = 0; i < 50; i++) expect(s.next().sub).not.toBe('classic')
  })

  it('tek tip akışı hep o tipi verir', () => {
    const s = createTimedStream(7, 'emoji')
    for (let i = 0; i < 20; i++) expect(s.next().sub).toBe('emoji')
  })
})
