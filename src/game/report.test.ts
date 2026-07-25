import { describe, it, expect } from 'vitest'
import { buildDiagnostic, reportMailtoUrl } from './report'
import { PATCH } from './data'

describe('buildDiagnostic', () => {
  it('context, sürüm ve tarih içerir', () => {
    const d = buildDiagnostic('Ayarlar')
    expect(d).toContain('Ekran: Ayarlar')
    expect(d).toContain(`Patch ${PATCH}`)
    expect(d).toContain('Tarih:')
  })

  it('detail verilince eklenir ve 800 karaktere kırpılır', () => {
    const d = buildDiagnostic('Çöküş', 'x'.repeat(2000))
    expect(d).toContain('Hata ayrıntısı:')
    expect(d).toContain('x'.repeat(800))
    expect(d).not.toContain('x'.repeat(801))
  })

  it('detail yokken hata ayrıntısı bölümü eklenmez', () => {
    expect(buildDiagnostic('Ayarlar')).not.toContain('Hata ayrıntısı:')
  })
})

describe('reportMailtoUrl (yedek)', () => {
  it('mailto: ile başlar ve rapor adresini içerir', () => {
    const url = reportMailtoUrl('Ayarlar', 'bir sorun var')
    expect(url.startsWith('mailto:yusfensyilmz@gmail.com?')).toBe(true)
  })

  it('konu ve gövde encode edilir; gövdede mesaj + context + Patch geçer', () => {
    const url = reportMailtoUrl('Ayarlar', 'skor kaydolmadı')
    const parsed = new URL(url)
    const subject = decodeURIComponent(parsed.searchParams.get('subject') ?? '')
    const body = decodeURIComponent(parsed.searchParams.get('body') ?? '')
    expect(subject).toContain('Hata bildirimi')
    expect(subject).toContain('Ayarlar')
    expect(body).toContain('skor kaydolmadı')
    expect(body).toContain('Ekran: Ayarlar')
    expect(body).toContain(`Patch ${PATCH}`)
  })

  it('mesaj boşsa yer tutucu yazılır', () => {
    const url = reportMailtoUrl('Ayarlar', '   ')
    const body = decodeURIComponent(new URL(url).searchParams.get('body') ?? '')
    expect(body).toContain('(açıklama yazılmadı)')
  })
})
