import { describe, expect, it, vi } from 'vitest'
import { applyBackup, buildBackup, clearProgress, progressKeys } from './backup'

function seed() {
  localStorage.setItem('vt:stats:endless:classic:normal', '{"played":5,"won":4}')
  localStorage.setItem('vt:ach', '{"first_blood":"2026-07-20"}')
  localStorage.setItem('vt:nick', 'Ahmet Çğş')
  localStorage.setItem('baska:uygulama', 'dokunma') // yabancı anahtar
}

describe('yedekleme', () => {
  it('yalnız vt: anahtarlarını toplar, yabancıya dokunmaz', () => {
    seed()
    const b = buildBackup()
    expect(Object.keys(b.data).sort()).toEqual(['vt:ach', 'vt:nick', 'vt:stats:endless:classic:normal'])
    expect(b.app).toBe('vadi-tahmini')
    expect(b.version).toBe(1)
  })

  it('gidiş-dönüş: yedek al → sıfırla → geri yükle (Türkçe karakter dahil)', () => {
    seed()
    const json = JSON.stringify(buildBackup())

    clearProgress()
    expect(progressKeys()).toEqual([])
    expect(localStorage.getItem('baska:uygulama')).toBe('dokunma') // yabancı kayıt korunur

    const res = applyBackup(json)
    expect(res).toEqual({ ok: true, count: 3 })
    expect(localStorage.getItem('vt:nick')).toBe('Ahmet Çğş')
    expect(localStorage.getItem('vt:ach')).toBe('{"first_blood":"2026-07-20"}')
  })

  it('yükleme mevcut ilerlemenin yerine geçer (birleştirmez)', () => {
    localStorage.setItem('vt:nick', 'Eski')
    localStorage.setItem('vt:stats:endless:classic:normal', '{"played":99}')
    const json = JSON.stringify({
      app: 'vadi-tahmini', version: 1, exportedAt: '', data: { 'vt:nick': 'Yeni' },
    })
    expect(applyBackup(json)).toEqual({ ok: true, count: 1 })
    expect(localStorage.getItem('vt:nick')).toBe('Yeni')
    expect(localStorage.getItem('vt:stats:endless:classic:normal')).toBeNull() // eski kayıt gitti
  })

  it('bozuk/yabancı dosyalar reddedilir ve mevcut ilerleme korunur', () => {
    seed()
    const before = localStorage.getItem('vt:nick')

    for (const bad of [
      'bu json degil',
      JSON.stringify({ app: 'baska-oyun', version: 1, data: {} }),
      JSON.stringify({ app: 'vadi-tahmini', version: 99, data: {} }),
      JSON.stringify({ app: 'vadi-tahmini', version: 1 }), // data yok
      JSON.stringify({ app: 'vadi-tahmini', version: 1, data: { 'kotu:anahtar': 'x' } }), // vt: yok
    ]) {
      const res = applyBackup(bad)
      expect(res.ok).toBe(false)
    }
    expect(localStorage.getItem('vt:nick')).toBe(before) // hiçbiri veriyi bozmadı
  })

  it('yazma hatasında eski ilerlemeyi geri yükler', () => {
    seed()
    // Seed değişirse geri alma testi de gerçek eski değeri doğrulamayı sürdürsün.
    const previousNick = localStorage.getItem('vt:nick')
    const incoming = JSON.stringify({
      app: 'vadi-tahmini', version: 1, exportedAt: '', data: { 'vt:nick': 'Yeni' },
    })
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
      throw new Error('kota dolu')
    })

    const result = applyBackup(incoming)

    expect(result).toEqual({ ok: false, error: 'Yedek yazılırken hata oluştu; eski ilerlemen geri yüklendi.' })
    expect(localStorage.getItem('vt:nick')).toBe(previousNick)
    expect(localStorage.getItem('vt:ach')).toBe('{"first_blood":"2026-07-20"}')
    setItem.mockRestore()
  })
})
