/**
 * Vadi Tahmini · localStorage Şema Versiyonlama & Migrasyon Katmanı
 *
 * Kullanıcı verileri (istatistikler, seriler, rozetler vb.) tarayıcı hafızasında tutulur.
 * Veri yapısı değiştiğinde eski kayıtların bozulmasını veya sessizce sıfırlanmasını
 * önlemek için versiyon kontrolü ve migrasyon fonksiyonları bu modülde toplanır.
 */

export const CURRENT_STORAGE_VERSION = 1
const VERSION_KEY = 'vt:storage_version'

/** Güvenli JSON okuma yardımcı fonksiyonu */
export function safeGetItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** Güvenli JSON yazma yardımcı fonksiyonu */
export function safeSetItem<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (err) {
    console.error(`localStorage setItem failed for key "${key}":`, err)
    return false
  }
}

/**
 * Uygulama başlarken çağrılır.
 * Kayıtlı versiyon ile mevcut versiyonu karşılaştırır ve gerekirse migrasyon zincirini çalıştırır.
 */
export function initStorageMigration() {
  try {
    const rawVersion = localStorage.getItem(VERSION_KEY)
    const storedVersion = rawVersion ? parseInt(rawVersion, 10) : 0

    if (storedVersion < CURRENT_STORAGE_VERSION) {
      runMigrations(storedVersion, CURRENT_STORAGE_VERSION)
      localStorage.setItem(VERSION_KEY, String(CURRENT_STORAGE_VERSION))
    }
  } catch (err) {
    console.error('Storage migration failed:', err)
  }
}

/**
 * Versiyon geçiş adımları.
 * İleride v2, v3 eklendiğinde buraya sırasıyla step-by-step migrasyon mantığı eklenebilir.
 */
function runMigrations(fromVersion: number, _toVersion: number) {
  // v0 -> v1: Varsayılan ilk versiyon damgası
  if (fromVersion < 1) {
    // Gelecek versiyonlar için temel hazırdır
  }

  // Örnek: v1 -> v2 (Gelecekte veri yapısı değişirse):
  // if (fromVersion < 2 && toVersion >= 2) { ... }
}

// Uygulama yüklenirken doğrudan ilk kontrolü yap
initStorageMigration()
