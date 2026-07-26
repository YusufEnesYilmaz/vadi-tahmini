import { describe, it, expect } from 'vitest'
import { REPORT_KINDS, buildDiagnostic, reportContext, reportMailtoUrl } from './report'
import { PATCH } from './data'

describe('geri bildirim türü', () => {
  // Tür ayrı KOLON değil, `context` öneki olarak taşınıyor (şema değişmesin diye).
  it('context önekini türe göre yazar', () => {
    expect(reportContext('bug', 'Ayarlar')).toBe('Hata · Ayarlar')
    expect(reportContext('idea', 'Ayarlar')).toBe('Öneri · Ayarlar')
  })

  it('önek `submit_report` context sınırına (80) rahat sığar', () => {
    expect(reportContext('idea', 'Ayarlar').length).toBeLessThanOrEqual(80)
  })

  it('her tür için metinler dolu (modal başlık/placeholder tek kaynak)', () => {
    for (const meta of Object.values(REPORT_KINDS)) {
      expect(meta.label.length).toBeGreaterThan(0)
      expect(meta.title.length).toBeGreaterThan(0)
      expect(meta.placeholder.length).toBeGreaterThan(0)
      expect(meta.sentTitle.length).toBeGreaterThan(0)
    }
  })
})

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

  it('öneri bağlamında konu "Öneri" der, hata yolunda eski metin korunur', () => {
    const idea = new URL(reportMailtoUrl(reportContext('idea', 'Ayarlar'), 'şu mod eklensin'))
    expect(decodeURIComponent(idea.searchParams.get('subject') ?? '')).toContain('Öneri')

    const bug = new URL(reportMailtoUrl(reportContext('bug', 'Ayarlar'), 'skor kaydolmadı'))
    expect(decodeURIComponent(bug.searchParams.get('subject') ?? '')).toContain('Hata bildirimi')
  })

  it('mesaj boşsa yer tutucu yazılır', () => {
    const url = reportMailtoUrl('Ayarlar', '   ')
    const body = decodeURIComponent(new URL(url).searchParams.get('body') ?? '')
    expect(body).toContain('(açıklama yazılmadı)')
  })
})
