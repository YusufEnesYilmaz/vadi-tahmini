import { PATCH } from './data'

/** Hata/geri bildirim raporlarının gideceği adres (mailto yedeği için). */
const REPORT_EMAIL = 'yusfensyilmz@gmail.com'

/** Geri bildirim türü — hata mı, öneri mi */
export type ReportKind = 'bug' | 'idea'

/**
 * Tür metinleri TEK KAYNAK: modal başlığı, açıklaması, placeholder'ı ve başarı
 * mesajı buradan okunur; iki yerde ayrı yazılıp zamanla sapmasın.
 */
export const REPORT_KINDS: Record<
  ReportKind,
  { label: string; icon: string; title: string; hint: string; placeholder: string; sentTitle: string; sentNote: string }
> = {
  bug: {
    label: 'Hata',
    icon: '🐛',
    title: 'Hata bildir',
    hint: 'Sorunu kısaca anlat (ne yaptın, ne bekledin, ne oldu). Sürüm ve cihaz bilgisi otomatik eklenir.',
    placeholder: "Örn: Zamana Karşı'da süre bitince skor kaydedilmedi...",
    sentTitle: 'Raporun gönderildi',
    sentNote: 'Teşekkürler — sorunu bulmamıza yardımcı oldun.',
  },
  idea: {
    label: 'Öneri',
    icon: '💡',
    title: 'Öneri gönder',
    hint: 'Aklındaki fikri anlat: yeni bir mod, eksik bulduğun bir şey ya da düzelmesini istediğin bir ayrıntı.',
    placeholder: 'Örn: Bağlantılar\'a "aynı bölgeden" grubu eklenebilir...',
    sentTitle: 'Önerin gönderildi',
    sentNote: 'Teşekkürler — fikrini not aldık.',
  },
}

/**
 * Rapor kaydının `context` alanı: `"Hata · Ayarlar"` / `"Öneri · Ayarlar"`.
 *
 * ⚠ Tür BİLEREK ayrı bir veritabanı kolonuna yazılmıyor: yeni kolon, Supabase
 * panelinde ELLE SQL çalıştırmayı gerektirirdi ve bu depoda o adımın atlanması
 * skor gönderimini aylarca sessizce bozmuştu (2026-07-23). `context` alanı zaten
 * ≤80 karakter kabul ediyor; önek oraya sığıyor ve şema hiç değişmiyor.
 */
export function reportContext(kind: ReportKind, screen: string): string {
  return `${REPORT_KINDS[kind].label} · ${screen}`
}

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
  // Konu türü `context` önekinden okur ("Öneri · Ayarlar" → "Öneri").
  // Önek yoksa (eski çağrı) eski davranış korunur: "Hata bildirimi".
  const isIdea = context.startsWith(`${REPORT_KINDS.idea.label} ·`)
  const subject = `Vadi Tahmini — ${isIdea ? 'Öneri' : 'Hata bildirimi'} (${context})`
  const body = [
    message.trim() || '(açıklama yazılmadı)',
    '',
    '— — — — —',
    buildDiagnostic(context, detail),
  ].join('\n')
  return `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
