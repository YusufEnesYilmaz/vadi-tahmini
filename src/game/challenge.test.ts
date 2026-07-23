import { describe, expect, it } from 'vitest'
import { encodeChallenge, parseChallenge, type Challenge } from './challenge'
import { createTimedStream } from './puzzle'
import { PATCH } from './data'
import { champOf } from '../test/helpers'
import { DIFFICULTIES, SUB_MODES, type PlaySub } from './types'

describe('meydan okuma payload', () => {
  const sample: Challenge = { seed: 3141592653, sub: 'mix', diff: 'hard', score: 12, combo: 5, nick: 'Ahmet Çğş', filter: 'region:Noxus' }

  it('encode → parse gidiş-dönüş korunur (Türkçe ad dahil)', () => {
    const c = parseChallenge(encodeChallenge(sample))
    expect(c).not.toBeNull()
    // `dataVersion` linke ÜRETİM anında damgalanır (girdide yok, çıktıda var):
    // aynı seed farklı havuzla farklı soru üretebiliyor, karşı taraf uyarılabilsin.
    expect(c).toEqual({ ...sample, dataVersion: PATCH })
  })

  it('veri sürümü olmayan ESKİ linkler hâlâ çalışır (yalnız uyarı gösterilmez)', () => {
    // `dv` alanı eklenmeden önce paylaşılmış linkler reddedilmemeli
    const eski = btoa(JSON.stringify({ v: 1, s: 42, m: 'classic', d: 'normal', sc: 5, cb: 2, n: 'Ali', f: 'all' }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const c = parseChallenge(eski)
    expect(c).not.toBeNull()
    expect(c!.dataVersion).toBeUndefined()
    expect(c!.seed).toBe(42)
  })

  it('çoklu seçim filtre anahtarı link içinde bozulmadan taşınır (+ ve ; dahil)', () => {
    // İki oyuncu aynı havuzdan oynasın: r:Noxus+Ionia;o:Tank linkte hayatta kalmalı
    const multi: Challenge = { ...sample, filter: 'r:Ionia+Noxus;o:Tank;k:Üst' }
    expect(parseChallenge(encodeChallenge(multi))?.filter).toBe(multi.filter)
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

describe('meydan okuma — mod kapsamı', () => {
  it('HER alt mod ve Karışık için link üretilip çözülebilir', () => {
    // Liste elle yazıldığında Eşya/Silüet/Hikâye linkleri sessizce reddediliyordu
    for (const sub of [...SUB_MODES.map((m) => m.id), 'mix'] as PlaySub[]) {
      const c: Challenge = { seed: 42, sub, diff: 'normal', score: 7, combo: 3, nick: 'test', filter: 'all' }
      const back = parseChallenge(encodeChallenge(c))
      expect(back, `link çözülemedi: ${sub}`).not.toBeNull()
      expect(back!.sub).toBe(sub)
    }
  })

  it('HER zorluk için link çözülebilir', () => {
    for (const d of DIFFICULTIES.map((x) => x.id)) {
      const c: Challenge = { seed: 1, sub: 'classic', diff: d, score: 0, combo: 0, nick: '', filter: 'all' }
      expect(parseChallenge(encodeChallenge(c))?.diff, `zorluk çözülemedi: ${d}`).toBe(d)
    }
  })

  it('çoklu seçim filtresi linkte taşınır', () => {
    const c: Challenge = { seed: 5, sub: 'mix', diff: 'hard', score: 3, combo: 1, nick: 'a', filter: 'r:Ionia+Noxus;o:Tank' }
    expect(parseChallenge(encodeChallenge(c))?.filter).toBe('r:Ionia+Noxus;o:Tank')
  })
})
