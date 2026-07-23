import { describe, expect, it } from 'vitest'
import { RULES } from './difficulty'
import { shareTimed } from './share'
import { DIFFICULTIES } from './types'

describe('paylaşım metni', () => {
  it('Zamana Karşı: süre zorluğun gerçek süresidir (sabit yazılmaz)', () => {
    // Bir kez yaşandı: metin hep "60 saniyede" diyordu, Kolay'da 90 sn oynanmasına rağmen.
    for (const d of DIFFICULTIES) {
      const secs = RULES[d.id].timedSeconds
      expect(shareTimed('classic', 12, false, secs)).toContain(`${secs} saniyede 12 doğru!`)
    }
  })

  it('rekor bandı yalnız rekorda eklenir', () => {
    expect(shareTimed('emoji', 7, true, 60)).toContain('YENİ REKOR')
    expect(shareTimed('emoji', 7, false, 60)).not.toContain('YENİ REKOR')
  })
})
