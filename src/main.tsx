import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { initPwaUpdate } from './game/pwaUpdate.ts'
import './game/storage.ts'

/*
 * Servis çalışanını kaydet + "yeni sürüm hazır" sinyalini dinlemeye başla.
 * React dışında, bir kez — StrictMode çift render'ı SW'yi iki kez kaydetmesin.
 */
initPwaUpdate()

/*
 * Tek seferlik temizlik: eski 'cdragon-vo' önbelleği opak (okunamayan) ses
 * cevapları içeriyor ve Replik modunda sesin hiç çalmamasına yol açıyordu.
 * Yeni sürüm 'cdragon-vo-v2' kullanıyor; eskisi burada siliniyor ki yer kaplamasın.
 * Birkaç sürüm sonra bu blok kaldırılabilir.
 */
void caches?.delete('cdragon-vo')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
