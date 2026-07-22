/*
 * Geliştirici "god mode" — YALNIZ yerel geliştirme sunucusunda (vite dev) geçerli.
 *
 * `import.meta.env.DEV`:
 *   - `npm run dev` (localhost) → true
 *   - `npm run build` (üretim/Vercel) → false, ÜstElİk derlemede sabit `false`
 *     olarak gömülür; dolayısıyla `godMode()` gövdesi ve god'a bağlı tüm dallar
 *     ölü kod olarak elenir. Canlıda asla çalışmaz, arayüzde de görünmez.
 *
 * Açıkken günlük modlar, Kelime ve Bingo "bugün oynandı" kilidini uygulamaz —
 * her girişte taze başlar, istediğin kadar tekrar oynanır.
 */

const KEY = 'vt:god'

/** Bu ortamda god mode arayüzü gösterilsin mi? (yalnız yerel dev) */
export const godModeAvailable = import.meta.env.DEV

/** God mode şu an açık mı? Üretimde her zaman false. */
export function godMode(): boolean {
  return import.meta.env.DEV && localStorage.getItem(KEY) === '1'
}

export function setGodMode(on: boolean): void {
  if (on) localStorage.setItem(KEY, '1')
  else localStorage.removeItem(KEY)
}
