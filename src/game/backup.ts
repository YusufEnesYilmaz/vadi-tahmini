import { todayKey } from './rng'

/**
 * İlerleme yedekleme — her şey cihaza özel localStorage'da duruyor
 * (rozetler, gün serisi, rekorlar, deste durumu). Telefon değişince ya da
 * tarayıcı verisi temizlenince hepsi giderdi; bu dosya taşınmasını sağlar.
 *
 * Not: `Object.keys(localStorage)` KULLANMIYORUZ — Storage arayüzünün
 * `length`/`key(i)` API'si hem tarayıcıda hem testteki bellek taklidinde çalışır.
 */

const PREFIX = 'vt:'

export interface BackupFile {
  app: 'vadi-tahmini'
  version: 1
  exportedAt: string
  data: Record<string, string>
}

/** Kayıtlı tüm vt: anahtarları (sırayla silmek için önce toplanır) */
export function progressKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(PREFIX)) keys.push(k)
  }
  return keys
}

export function buildBackup(): BackupFile {
  const data: Record<string, string> = {}
  for (const k of progressKeys()) data[k] = localStorage.getItem(k) ?? ''
  return {
    app: 'vadi-tahmini',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  }
}

/** Tüm ilerlemeyi sil (Ayarlar > sıfırla ve yedek yüklemeden önce kullanılır) */
export function clearProgress() {
  for (const k of progressKeys()) localStorage.removeItem(k)
}

export function downloadBackup() {
  const blob = new Blob([JSON.stringify(buildBackup(), null, 1)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vadi-tahmini-yedek-${todayKey()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export type ImportResult =
  | { ok: true; count: number }
  | { ok: false; error: string }

/**
 * Yedeği uygula. Birleştirme YAPILMAZ: iki cihazın istatistiğini birleştirmenin
 * doğru cevabı yok (hangi seri geçerli? rekorlar toplanır mı?) — bu yüzden
 * yedek mevcut ilerlemenin yerine geçer. Arayüz bunu onaylatır.
 */
export function applyBackup(text: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Dosya okunamadı — geçerli bir JSON değil.' }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Dosya biçimi tanınmadı.' }
  }
  const b = parsed as Partial<BackupFile>
  if (b.app !== 'vadi-tahmini') {
    return { ok: false, error: 'Bu dosya bir Vadi Tahmini yedeği değil.' }
  }
  if (b.version !== 1) {
    return { ok: false, error: `Desteklenmeyen yedek sürümü: ${String(b.version)}` }
  }
  if (!b.data || typeof b.data !== 'object') {
    return { ok: false, error: 'Yedek içeriği bozuk.' }
  }

  // Yalnız kendi anahtarlarımızı ve yalnız metin değerleri al — yabancı içerik sızmasın
  const entries = Object.entries(b.data).filter(
    ([k, v]) => k.startsWith(PREFIX) && typeof v === 'string',
  )
  if (entries.length === 0) {
    return { ok: false, error: 'Yedekte geri yüklenecek kayıt yok.' }
  }

  // Yazma yarıda kesilirse oyuncunun eski ilerlemesi kaybolmasın diye önce anlık görüntü al.
  const previous = buildBackup().data
  try {
    clearProgress()
    for (const [k, v] of entries) localStorage.setItem(k, v)
    return { ok: true, count: entries.length }
  } catch {
    clearProgress()
    for (const [k, v] of Object.entries(previous)) localStorage.setItem(k, v)
    return { ok: false, error: 'Yedek yazılırken hata oluştu; eski ilerlemen geri yüklendi.' }
  }
}
