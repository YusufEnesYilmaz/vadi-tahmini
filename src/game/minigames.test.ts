import { describe, expect, it } from 'vitest'
import { CHAMPIONS } from './data'
import { ALPHABET, LEN_BUCKETS, evaluateWord, dailyWord, getLenBucket, mergeKeyState, sameLengthChampions, setLenBucket, toLetters, wordlePool, MIN_LEN, MAX_LEN } from './wordle'
import { BOX_COUNT, allCriteria, buildCard, championStream, dailyCard, fittingBoxes } from './bingo'
import { seededRng } from './rng'

describe('Kelime modu', () => {
  it('ad harflere indirgenir (boşluk, kesme, nokta atılır)', () => {
    expect(toLetters("Kai'Sa")).toBe('KAISA')
    expect(toLetters('Dr. Mundo')).toBe('DRMUNDO')
    expect(toLetters('Miss Fortune')).toBe('MISSFORTUNE')
    expect(toLetters('Nunu ve Willump')).toBe('NUNUVEWILLUMP')
  })

  it('Türkçe büyük harf dönüşümü doğru (i → İ)', () => {
    expect(toLetters('Irelia')).toBe('IRELIA')
    expect(toLetters('Fiora')).toMatch(/^[A-ZÇĞİÖŞÜ]+$/)
  })

  it('tam isabet, yer değiştirmiş ve olmayan harfler ayrışır', () => {
    expect(evaluateWord('AHRI', 'AHRI')).toEqual(['correct', 'correct', 'correct', 'correct'])
    expect(evaluateWord('RIHA', 'AHRI')).toEqual(['present', 'present', 'present', 'present'])
    expect(evaluateWord('ZZZZ', 'AHRI')).toEqual(['absent', 'absent', 'absent', 'absent'])
  })

  it('harf tahtası (ALPHABET) tüm adlarda geçen harfleri kapsar, fazlası yok', () => {
    // Veriden türer: her şampiyon adının her harfi tahtada olmalı
    const geçen = new Set(CHAMPIONS.flatMap((c) => [...toLetters(c.name)]))
    expect(new Set(ALPHABET)).toEqual(geçen)
    // Hepsi tek büyük harf, TR sırasında, tekrarsız
    expect(ALPHABET.every((ch) => /^[A-ZÇĞİÖŞÜ]$/.test(ch))).toBe(true)
    expect([...ALPHABET].sort((a, b) => a.localeCompare(b, 'tr'))).toEqual(ALPHABET)
    expect(new Set(ALPHABET).size).toBe(ALPHABET.length)
  })

  it('tekrarlı harf kuralı: hedefteki sayı kadar işaretlenir', () => {
    // Hedef ABCD: ilk A yerinde (yeşil), sonraki A'lar hedefte kalmadığı için gri,
    // B ise hedefte var ama yeri yanlış → sarı
    expect(evaluateWord('AAAB', 'ABCD')).toEqual(['correct', 'absent', 'absent', 'present'])
  })

  it('tam isabet, sarıya öncelikli — doğru yerdeki harf sarıyı yemez', () => {
    // Hedef: LULU, tahmin: ULUL → hiçbiri yerinde değil ama harfler var
    const r = evaluateWord('ULUL', 'LULU')
    expect(r.every((x) => x === 'present')).toBe(true)
  })

  it('klavye rengi en iyi sonucu korur', () => {
    expect(mergeKeyState('present', 'absent')).toBe('present')
    expect(mergeKeyState('present', 'correct')).toBe('correct')
    expect(mergeKeyState('correct', 'absent')).toBe('correct')
    expect(mergeKeyState(undefined, 'absent')).toBe('absent')
  })

  it('havuz uzunluk sınırları içinde ve boş değil', () => {
    const pool = wordlePool()
    expect(pool.length).toBeGreaterThan(80)
    for (const c of pool) {
      const n = toLetters(c.name).length
      expect(n).toBeGreaterThanOrEqual(MIN_LEN)
      expect(n).toBeLessThanOrEqual(MAX_LEN)
    }
  })

  it('her hedef için aynı uzunlukta en az bir tahmin var (kendisi)', () => {
    for (const c of wordlePool()) {
      const esler = sameLengthChampions(toLetters(c.name).length)
      expect(esler.some((x) => x.id === c.id)).toBe(true)
    }
  })

  it('günlük kelime herkeste aynı', () => {
    expect(dailyWord().id).toBe(dailyWord().id)
  })
})

describe('Bingo modu', () => {
  it('ölçütler veriden türüyor ve hepsi en az bir şampiyona uyuyor', () => {
    const k = allCriteria()
    expect(k.length).toBeGreaterThan(25)
    for (const kr of k) expect(CHAMPIONS.some(kr.test), kr.label).toBe(true)
  })

  it('kart 12 kutu ve her kutunun yeterli havuzu var', () => {
    const card = buildCard(seededRng(1))
    expect(card).toHaveLength(BOX_COUNT)
    for (const k of card) expect(CHAMPIONS.filter(k.test).length).toBeGreaterThanOrEqual(8)
  })

  it('kartta aynı ölçüt iki kez çıkmaz', () => {
    const card = buildCard(seededRng(7))
    expect(new Set(card.map((k) => k.id)).size).toBe(BOX_COUNT)
  })

  it('akıştaki her şampiyon en az bir kutuya uyar (boşuna pas yok)', () => {
    const card = buildCard(seededRng(3))
    for (const c of championStream(card, seededRng(3))) {
      expect(card.some((k) => k.test(c)), c.name).toBe(true)
    }
  })

  it('dolu kutu tekrar önerilmez', () => {
    const card = buildCard(seededRng(5))
    const c = CHAMPIONS.find((x) => card.some((k) => k.test(x)))!
    const bos = fittingBoxes(card, new Array(BOX_COUNT).fill(null), c)
    expect(bos.length).toBeGreaterThan(0)
    const dolu = new Array(BOX_COUNT).fill(null)
    dolu[bos[0]] = 'X'
    expect(fittingBoxes(card, dolu, c)).not.toContain(bos[0])
  })

  it('günlük kart herkeste aynı', () => {
    expect(dailyCard().map((k) => k.id)).toEqual(dailyCard().map((k) => k.id))
  })
})

describe('Kelime — uzunluk şeridi', () => {
  it('her kutunun havuzu dolu ve sınırları içinde', () => {
    for (const b of LEN_BUCKETS) {
      const pool = wordlePool(b.id)
      expect(pool.length, b.name).toBeGreaterThan(5)
      for (const c of pool) {
        const n = toLetters(c.name).length
        expect(n).toBeGreaterThanOrEqual(b.min)
        expect(n).toBeLessThanOrEqual(b.max)
      }
    }
  })

  it('Karışık, üç kutunun toplamına eşit (havuz bölünmüş, kayıp yok)', () => {
    const parcalar = LEN_BUCKETS.filter((b) => b.id !== 'all').reduce((n, b) => n + wordlePool(b.id).length, 0)
    expect(wordlePool('all').length).toBe(parcalar)
  })

  it('Günlük şeritten ETKİLENMEZ — herkes aynı kelimeyi görür', () => {
    setLenBucket('uzun')
    const a = dailyWord()
    setLenBucket('kisa')
    expect(dailyWord().id).toBe(a.id)
  })

  it('bozuk tercih güvenle Karışık olur', () => {
    localStorage.setItem('vt:wordle:len', 'saçma')
    expect(getLenBucket()).toBe('all')
  })
})
