import { beforeEach, describe, expect, it } from 'vitest'
import { clearSubmitFailure, getSubmitFailure } from './supabase'

const FAIL_KEY = 'vt:lb:fail'

describe('sıralama gönderim hatası izi', () => {
  beforeEach(() => clearSubmitFailure())

  it('kayıt yokken null döner', () => {
    expect(getSubmitFailure()).toBeNull()
  })

  it('yazılan kayıt okunur', () => {
    localStorage.setItem(FAIL_KEY, JSON.stringify({ at: 1700000000000, mode: 'timed:classic:normal', msg: 'boom' }))
    const f = getSubmitFailure()
    expect(f?.mode).toBe('timed:classic:normal')
    expect(f?.msg).toBe('boom')
  })

  it('temizlenince uyarı kalkar', () => {
    localStorage.setItem(FAIL_KEY, JSON.stringify({ at: 1, mode: 'daily:emoji', msg: 'x' }))
    clearSubmitFailure()
    expect(getSubmitFailure()).toBeNull()
  })

  it('bozuk kayıt uyarı ÜRETMEZ (panel patlamamalı)', () => {
    // Elle bozulmuş ya da eski biçim veri yüzünden Sıralama paneli çökmemeli
    localStorage.setItem(FAIL_KEY, 'bu json değil')
    expect(getSubmitFailure()).toBeNull()
    localStorage.setItem(FAIL_KEY, JSON.stringify({ mode: 'timed:classic:normal' })) // `at` yok
    expect(getSubmitFailure()).toBeNull()
  })
})
