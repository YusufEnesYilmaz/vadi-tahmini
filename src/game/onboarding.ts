/*
 * İlk girişe özel öğretici (onboarding) bayrağı — TEK KAYNAK.
 *
 * Öğretici YALNIZ bir kez gösterilir: bayrak yazıldıktan sonra bir daha çıkmaz.
 * "Atla" da "Başla" da bayrağı yazar — oyuncu atlamayı SEÇTİYSE ısrar etmeyiz;
 * tam anlatım zaten Oyuncu Rehberi > Nasıl Oynanır'da duruyor.
 *
 * Anahtar `vt:` önekli olduğu için yedek al/yükle akışına (`backup.ts` tüm `vt:`
 * anahtarlarını toplar) kendiliğinden dahildir → yedeğini yeni cihaza yükleyen
 * oyuncuya öğretici tekrar çıkmaz. "Tüm ilerlemeyi sıfırla" bayrağı da sildiği
 * için sıfırlayan oyuncu öğreticiyi yeniden görür (istenen davranış).
 */

export const ONBOARDED_KEY = 'vt:onboarded'

/** İlk giriş mi? Depo kapalıysa (gizli sekme) öğretici gösterilmez — patlamaktan iyidir. */
export function needsOnboarding(): boolean {
  try {
    return !localStorage.getItem(ONBOARDED_KEY)
  } catch {
    return false
  }
}

/** Öğretici görüldü/atlandı olarak işaretle (idempotent). */
export function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDED_KEY, '1')
  } catch {
    // Depoya yazılamıyorsa sessiz geç — öğretici bir daha çıkar, oyun bozulmaz.
  }
}
