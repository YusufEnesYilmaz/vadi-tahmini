import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

/*
 * Servis çalışanı "yeni sürüm hazır" sinyalini (registerType: 'prompt' →
 * onNeedRefresh) tek yerde toplar. Bileşenler useUpdateAvailable() ile izler:
 * Menü'de Ayarlar butonuna baloncuk, Ayarlar'da "Güncelle" bandı çıkar.
 *
 * Kayıt REACT DIŞINDA (main.tsx) bir kez yapılır — StrictMode'un çift render'ı
 * SW'yi iki kez kaydetmesin. Store basit bir dinleyici kümesi.
 */

let updateAvailable = false
let apply: (() => Promise<void>) | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

/** Uygulama açılışında bir kez çağrılır. SW'yi kaydeder; yeni sürüm hazır olunca bildirir. */
export function initPwaUpdate() {
  if (apply) return // yalnız bir kez

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateAvailable = true
      emit()
    },
    onRegisteredSW(_swUrl, reg) {
      if (!reg) return
      // Uygulama açıkken de yeni sürümü yakala: saatte bir + sekmeye her dönüşte kontrol et.
      // (Aksi halde onNeedRefresh yalnız tarayıcının kendi doğal kontrolünde tetiklenir.)
      setInterval(() => void reg.update().catch(() => {}), 60 * 60 * 1000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg.update().catch(() => {})
      })
    },
  })

  // updateSW(true): bekleyen SW'yi aktive eder (skipWaiting) ve sayfayı yeniler.
  apply = () => updateSW(true)
}

/** "Güncelle" butonu → bekleyen sürümü uygula + yeniden başlat. */
export function applyUpdate(): Promise<void> {
  return apply ? apply() : Promise.resolve()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/** Yeni sürüm hazır mı? Hazır olunca bileşen yeniden render olur. */
export function useUpdateAvailable(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => updateAvailable,
    () => false,
  )
}
