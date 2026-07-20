import { describe, expect, it } from 'vitest'
import { encodeChallenge, parseChallenge, type Challenge } from './challenge'
import { createTimedStream } from './puzzle'
import { champOf } from '../test/helpers'

describe('meydan okuma payload', () => {
  const sample: Challenge = { seed: 3141592653, sub: 'mix', diff: 'hard', score: 12, combo: 5, nick: 'Ahmet Çğş', filter: 'region:Noxus' }

  it('encode → parse gidiş-dönüş korunur (Türkçe ad dahil)', () => {
    const c = parseChallenge(encodeChallenge(sample))
    expect(c).not.toBeNull()
    expect(c).toEqual(sample)
  })

  it('bozuk payload null döner, patlamaz', () => {
    expect(parseChallenge('bu-gecerli-base64-degil!!!')).toBeNull()
    expect(parseChallenge('')).toBeNull()
    expect(parseChallenge(btoa('{"v":99}'))).toBeNull() // yanlış sürüm
    expect(parseChallenge(btoa('{"v":1,"m":"olmayan"}'))).toBeNull() // geçersiz mod
  })

  it('filtre alanı olmayan ESKİ linkler hâlâ çalışır (tüm havuz varsayılır)', () => {
    // Filtre özelliğinden önce üretilmiş payload — `f` alanı yok
    const eski = btoa(JSON.stringify({ v: 1, s: 42, m: 'ability', d: 'normal', sc: 7, cb: 2, n: 'Eski' }))
    const c = parseChallenge(eski)
    expect(c).not.toBeNull()
    expect(c!.filter).toBe('all')
  })

  it('negatif/ondalık skorlar temizlenir', () => {
    const dirty = { ...sample, score: -5, combo: 3.9 }
    const c = parseChallenge(encodeChallenge(dirty))!
    expect(c.score).toBe(0)
    expect(c.combo).toBe(3)
  })
})

describe('seed determinizmi (meydan okumanın temeli)', () => {
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
