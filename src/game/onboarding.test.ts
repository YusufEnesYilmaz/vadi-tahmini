import { beforeEach, describe, expect, it } from 'vitest'
import { ONBOARDED_KEY, markOnboarded, needsOnboarding } from './onboarding'
import { buildBackup, clearProgress } from './backup'

describe('ilk giriş öğreticisi', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('anahtar yokken ilk giriş sayılır', () => {
    expect(needsOnboarding()).toBe(true)
  })

  it('işaretlendikten sonra bir daha çıkmaz', () => {
    markOnboarded()
    expect(localStorage.getItem(ONBOARDED_KEY)).toBe('1')
    expect(needsOnboarding()).toBe(false)
  })

  it('iki kez işaretlemek zararsız (idempotent)', () => {
    markOnboarded()
    markOnboarded()
    expect(needsOnboarding()).toBe(false)
  })

  // Yedeğini yeni cihaza yükleyen oyuncuya öğretici tekrar ÇIKMAMALI:
  // bayrak `vt:` önekli olduğu için yedeğe kendiliğinden giriyor.
  it('bayrak yedeğe dahil olur', () => {
    markOnboarded()
    expect(Object.keys(buildBackup().data)).toContain(ONBOARDED_KEY)
  })

  // "Tüm ilerlemeyi sıfırla" diyen oyuncu öğreticiyi yeniden görür — istenen davranış.
  it('ilerleme sıfırlanınca öğretici geri gelir', () => {
    markOnboarded()
    clearProgress()
    expect(needsOnboarding()).toBe(true)
  })
})
