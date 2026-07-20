import { describe, expect, it } from 'vitest'
import { encodeChallenge, parseChallenge, type Challenge } from './challenge'
import { createTimedStream } from './puzzle'

describe('meydan okuma payload', () => {
  const sample: Challenge = { seed: 3141592653, sub: 'mix', diff: 'hard', score: 12, combo: 5, nick: 'Ahmet Çğş' }

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
      expect(pa.champion.id).toBe(pb.champion.id)
      expect(pa.spellIndex).toBe(pb.spellIndex)
      expect(pa.skin?.num).toBe(pb.skin?.num)
      expect(pa.crop).toEqual(pb.crop)
      expect(pa.splashNum).toBe(pb.splashNum)
    }
  })

  it('farklı seed → farklı dizi (neredeyse kesin)', () => {
    const a = createTimedStream(1, 'ability')
    const b = createTimedStream(2, 'ability')
    const seqA = Array.from({ length: 10 }, () => a.next().champion.id)
    const seqB = Array.from({ length: 10 }, () => b.next().champion.id)
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
