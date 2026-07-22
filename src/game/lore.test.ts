import { describe, expect, it } from 'vitest'
import info from '../data/champion-info.json'
import { CHAMPIONS } from './data'
import { censorName, splitSentences } from './lore'
import { searchKey } from './data'

const LORE = info as Record<string, { lore: string }>

describe('hikâye modu', () => {
  it('her şampiyonun okunabilir uzunlukta hikâyesi var', () => {
    const eksik = CHAMPIONS.filter((c) => (LORE[c.id]?.lore?.length ?? 0) < 100).map((c) => c.name)
    expect(eksik, `hikâyesi yok/çok kısa: ${eksik.join(', ')}`).toEqual([])
  })

  it('şampiyonun adı metinden silinir — hiçbir hikâyede ad sızmaz', () => {
    // Modun tek kritik güvencesi: ad geçerse bilmece kendini söyler
    const sizan: string[] = []
    for (const c of CHAMPIONS) {
      const out = censorName(LORE[c.id].lore, c)
      if (searchKey(out).includes(searchKey(c.name))) sizan.push(c.name)
    }
    expect(sizan, `ad hâlâ görünüyor: ${sizan.join(', ')}`).toEqual([])
  })

  it('ad parçaları da silinir (çok kelimeli adlar)', () => {
    const mf = CHAMPIONS.find((c) => c.id === 'MissFortune')!
    const out = censorName('Bilo Fortune geldi. Miss Fortune gitti.', mf)
    expect(out).not.toMatch(/Fortune/i)
  })

  it('ekler adın peşinde kalır, cümle bozulmaz', () => {
    const ahri = CHAMPIONS.find((c) => c.id === 'Ahri')!
    expect(censorName("Ahri'nin kuyrukları", ahri)).toBe("█████'nin kuyrukları")
  })

  it('hikâyeler cümlelere bölünebiliyor — açılma kademesi buna dayanıyor', () => {
    const tekCumle = CHAMPIONS.filter((c) => splitSentences(LORE[c.id].lore).length < 2).map((c) => c.name)
    expect(tekCumle, `tek cümlelik hikâye (kademe işlemez): ${tekCumle.join(', ')}`).toEqual([])
  })
})
