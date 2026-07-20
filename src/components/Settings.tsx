import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { DATA, PATCH } from '../game/data'
import { checkAndUpdateData, type UpdateResult } from '../game/dataUpdate'

export default function Settings({ onExit }: { onExit: () => void }) {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  const [dataResult, setDataResult] = useState<UpdateResult | null>(null)
  const [checking, setChecking] = useState(false)

  // Veri güncellendiyse kısa bir onay gösterip sayfayı yenile
  useEffect(() => {
    if (dataResult?.status === 'updated') {
      const t = setTimeout(() => location.reload(), 1500)
      return () => clearTimeout(t)
    }
  }, [dataResult])

  async function updateData() {
    setChecking(true)
    setDataResult(null)
    const r = await checkAndUpdateData()
    setDataResult(r)
    setChecking(false)
  }

  function resetProgress() {
    if (!confirm('Tüm istatistik ve ilerleme silinecek. Emin misin?')) return
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('vt:')) localStorage.removeItem(k)
    }
    location.reload()
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-6">
      <button onClick={onExit} className="self-start rounded-lg border px-3 py-1.5 text-sm"
        style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
        ← Menü
      </button>
      <h1 className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>Ayarlar</h1>

      {/* Uygulama güncellemesi */}
      <section className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <h2 className="mb-1 font-bold" style={{ color: 'var(--gold-bright)' }}>Uygulama</h2>
        <p className="mb-3 text-sm" style={{ color: 'var(--text-dim)' }}>
          Yeni sürümler otomatik iner; hazır olduğunda buradan tek dokunuşla geçersin.
        </p>
        {needRefresh ? (
          <button onClick={() => updateServiceWorker(true)}
            className="rounded-lg px-4 py-2 font-bold"
            style={{ background: 'var(--gold)', color: '#0a0e1a' }}>
            🔄 Yeni sürüme geç
          </button>
        ) : (
          <span className="text-sm" style={{ color: 'var(--correct)' }}>✓ Uygulama güncel</span>
        )}
      </section>

      {/* Veri güncellemesi */}
      <section className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <h2 className="mb-1 font-bold" style={{ color: 'var(--gold-bright)' }}>Şampiyon Verisi</h2>
        <p className="mb-3 text-sm" style={{ color: 'var(--text-dim)' }}>
          Mevcut: <b>Patch {PATCH}</b> ({DATA.champions.length} şampiyon,{' '}
          {DATA.champions.reduce((n, c) => n + c.skins.length, 0)} kostüm)
          <br />
          Yeni şampiyon veya kostüm çıktıysa buradan çek.
        </p>
        <button onClick={updateData} disabled={checking}
          className="rounded-lg px-4 py-2 font-bold disabled:opacity-50"
          style={{ background: 'var(--blue)', color: '#0a0e1a' }}>
          {checking ? 'Kontrol ediliyor...' : '⬇ Veriyi güncelle'}
        </button>
        {dataResult?.status === 'uptodate' && (
          <p className="mt-2 text-sm" style={{ color: 'var(--correct)' }}>✓ Veri zaten güncel (Patch {dataResult.version})</p>
        )}
        {dataResult?.status === 'updated' && (
          <p className="mt-2 text-sm" style={{ color: 'var(--correct)' }}>
            ✓ {dataResult.from} → {dataResult.to} güncellendi!
            {dataResult.newChampions.length > 0 && <> Yeni şampiyonlar: {dataResult.newChampions.join(', ')}.</>}
            {' '}Sayfa yenileniyor...
          </p>
        )}
        {dataResult?.status === 'error' && (
          <p className="mt-2 text-sm" style={{ color: '#f87171' }}>Hata: {dataResult.message}</p>
        )}
      </section>

      {/* Sıfırlama */}
      <section className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <h2 className="mb-1 font-bold" style={{ color: 'var(--gold-bright)' }}>İlerleme</h2>
        <p className="mb-3 text-sm" style={{ color: 'var(--text-dim)' }}>
          İstatistikler, seriler ve deste durumu bu cihazda saklanır.
        </p>
        <button onClick={resetProgress} className="rounded-lg border px-4 py-2 text-sm font-semibold"
          style={{ borderColor: 'var(--wrong)', color: '#f87171' }}>
          Tüm ilerlemeyi sıfırla
        </button>
      </section>

      <p className="text-center text-xs" style={{ color: 'var(--text-dim)' }}>
        Vadi Tahmini, Riot Games ile ilişkili değildir. Şampiyon verileri ve görseller Riot Games'in
        Data Dragon servisinden gelir.
      </p>
    </div>
  )
}
