import { describe, expect, it } from 'vitest'
import { CHAMPIONS, EMOJI, EMOJI_IDS } from './data'
import { nextPuzzle } from './puzzle'

describe('bulmaca üretimi', () => {
  it('Günlük aynı gün içinde hep aynı cevabı verir', () => {
    // Arkadaşların skorlarını karşılaştırabilmesi buna bağlı
    const a = nextPuzzle('daily', 'classic')
    const b = nextPuzzle('daily', 'classic')
    expect(a.champion.id).toBe(b.champion.id)
  })

  it('Günlük alt modları birbirinden farklı bulmaca verir', () => {
    const ids = (['classic', 'ability', 'splash', 'emoji'] as const).map((s) => nextPuzzle('daily', s).champion.id)
    expect(new Set(ids).size).toBeGreaterThan(1)
  })

  it('Günlük ek rastgelelik de deterministik (yetenek, kırpma, kostüm)', () => {
    const a = nextPuzzle('daily', 'ability')
    const b = nextPuzzle('daily', 'ability')
    expect(a.spellIndex).toBe(b.spellIndex)

    const c = nextPuzzle('daily', 'splash')
    const d = nextPuzzle('daily', 'splash')
    expect(c.crop).toEqual(d.crop)
    expect(c.splashNum).toBe(d.splashNum)
  })

  it('Emoji modu yalnız emoji verisi olan şampiyonları seçer', () => {
    for (let i = 0; i < 30; i++) {
      const p = nextPuzzle('endless', 'emoji')
      expect(EMOJI[p.champion.id]?.length).toBeGreaterThan(0)
    }
  })

  it('bütün şampiyonların emojisi var (yeni şampiyon eklenince bu test uyarır)', () => {
    const eksik = CHAMPIONS.filter((c) => !EMOJI[c.id]?.length).map((c) => c.name)
    expect(eksik, `emoji verisi eksik: ${eksik.join(', ')}`).toEqual([])
    expect(EMOJI_IDS.length).toBe(CHAMPIONS.length)
  })

  it('yetenek modunda tuş indeksi geçerli aralıkta (0=Pasif, 1-4=QWER)', () => {
    for (let i = 0; i < 30; i++) {
      const p = nextPuzzle('endless', 'ability')
      expect(p.spellIndex).toBeGreaterThanOrEqual(0)
      expect(p.spellIndex).toBeLessThanOrEqual(4)
    }
  })

  it('kostüm modunda hedef kostüm gerçekten o şampiyona ait', () => {
    for (let i = 0; i < 20; i++) {
      const p = nextPuzzle('endless', 'skin')
      expect(p.champion.skins.some((s) => s.num === p.skin?.num)).toBe(true)
    }
  })
})
