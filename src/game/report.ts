import { PATCH } from './data'

/** Hata/geri bildirim raporlarının gideceği adres (mailto yedeği için). */
const REPORT_EMAIL = 'yusfensyilmz@gmail.com'

/**
 * Rapora eklenecek otomatik tanı metni: sürüm, ekran, tarih, tarayıcı, viewport
 * ve (varsa) hata ayrıntısı. `detail` (hata mesajı + stack) mailto/DB sınırına
 * takılmasın diye 800 karaktere kırpılır.
 */
export function buildDiagnostic(context: string, detail?: string): string {
  const lines = [
    `Ekran: ${context}`,
    `Sürüm: Patch ${PATCH}`,
    `Tarih: ${new Date().toISOString()}`,
  ]
  if (typeof navigator !== 'undefined') {
    lines.push(`Tarayıcı: ${navigator.userAgent}`)
  }
  if (typeof window !== 'undefined') {
    lines.push(`Ekran boyutu: ${window.innerWidth}x${window.innerHeight}`)
  }
  if (detail) {
    lines.push('', 'Hata ayrıntısı:', detail.slice(0, 800))
  }
  return lines.join('\n')
}

/**
 * YEDEK yol: Supabase yoksa (yerel geliştirme / backend kapalı) kullanıcının mail
 * uygulamasını açar. Ana yol `submitReport` (site üzerinden Supabase'e yazar).
 */
export function reportMailtoUrl(context: string, message: string, detail?: string): string {
  const subject = `Vadi Tahmini — Hata bildirimi (${context})`
  const body = [
    message.trim() || '(açıklama yazılmadı)',
    '',
    '— — — — —',
    buildDiagnostic(context, detail),
  ].join('\n')
  return `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
