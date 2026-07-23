import { beforeEach, describe, expect, it } from 'vitest'
import { getVolume, setVolume } from './sfx'

const VOLUME_KEY = 'vt:volume'

/**
 * Bu testlerin var olma sebebi gerçek bir regresyon: eşik bir ara `v > 0`'dan
 * `v >= 0`'a çevrildi. `localStorage.getItem` anahtar yokken `null` döner ve
 * `Number(null)` **0**'dır → hiç ses ayarı yapmamış oyuncuda seviye 0 çıktı ve
 * TÜM efektler sessizleşti. Ayrım burada kilitleniyor: "anahtar yok" ≠ "0 yazılmış".
 */
describe('ses seviyesi', () => {
  beforeEach(() => localStorage.removeItem(VOLUME_KEY))

  it('hiç ayarlanmamışsa varsayılan 0.8 (0 DEĞİL)', () => {
    expect(getVolume()).toBe(0.8)
  })

  it('boş dize de "ayarlanmamış" sayılır', () => {
    localStorage.setItem(VOLUME_KEY, '')
    expect(getVolume()).toBe(0.8)
    localStorage.setItem(VOLUME_KEY, '   ')
    expect(getVolume()).toBe(0.8)
  })

  it('bilerek sessize alma korunur: "0" yazılıysa 0 döner', () => {
    localStorage.setItem(VOLUME_KEY, '0')
    expect(getVolume()).toBe(0)
  })

  it('kayıtlı değer okunur ve 1 üstü kırpılır', () => {
    localStorage.setItem(VOLUME_KEY, '0.35')
    expect(getVolume()).toBe(0.35)
    localStorage.setItem(VOLUME_KEY, '5')
    expect(getVolume()).toBe(1)
  })

  it('bozuk değerde varsayılana döner', () => {
    localStorage.setItem(VOLUME_KEY, 'çok yüksek')
    expect(getVolume()).toBe(0.8)
    localStorage.setItem(VOLUME_KEY, '-1') // negatif: geçersiz
    expect(getVolume()).toBe(0.8)
  })

  it('setVolume 0–1 aralığına sıkıştırır ve okunabilir kalır', () => {
    setVolume(0.5)
    expect(getVolume()).toBe(0.5)
    setVolume(2)
    expect(getVolume()).toBe(1)
    setVolume(-3)
    expect(getVolume()).toBe(0)
  })
})
