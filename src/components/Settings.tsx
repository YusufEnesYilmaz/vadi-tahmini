import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { applyBackup, clearProgress, downloadBackup } from '../game/backup'
import { getNick, setNick } from '../game/challenge'
import { DATA, PATCH } from '../game/data'
import { checkAndUpdateData, type UpdateResult } from '../game/dataUpdate'
import { playCorrect, setSfxEnabled, sfxEnabled } from '../game/sfx'

export default function Settings({ onExit }: { onExit: () => void }) {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  const [dataResult, setDataResult] = useState<UpdateResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [sfx, setSfx] = useState(sfxEnabled)
  const [nick, setNickState] = useState(getNick)
  const [nickSaved, setNickSaved] = useState(false)
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function saveNick() {
    setNick(nick)
    setNickState(getNick())
    setNickSaved(true)
    setTimeout(() => setNickSaved(false), 2000)
  }

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
    clearProgress()
    location.reload()
  }

  /** Yedek dosyası seçildi → doğrula, uygula, sayfayı yenile */
  async function onBackupFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // aynı dosya tekrar seçilebilsin
    if (!file) return
    if (!confirm('Yedek yüklenecek ve bu cihazdaki mevcut ilerlemenin YERİNE geçecek. Devam edilsin mi?')) return

    const res = applyBackup(await file.text())
    if (res.ok) {
      setImportMsg({ ok: true, text: `✓ ${res.count} kayıt geri yüklendi. Sayfa yenileniyor...` })
      setTimeout(() => location.reload(), 1500)
    } else {
      setImportMsg({ ok: false, text: res.error })
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-6">
      <button onClick={onExit} className="self-start rounded-xl border px-3 py-1.5 text-sm"
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
            className="rounded-xl px-4 py-2 font-bold"
            style={{ background: 'var(--gold)', color: 'var(--on-gold)' }}>
            🔄 Yeni sürüme geç
          </button>
        ) : (
          <span className="text-sm" style={{ color: 'var(--correct)' }}>✓ Uygulama güncel</span>
        )}
      </section>

      {/* Veri güncellemesi */}
      <section className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <h2 className="mb-1 font-bold" style={{ color: 'var(--gold-bright)' }}>Şampiyon Verisi</h2>
        <p className="mb-3 text-sm" style={{ color: 'var(--text)' }}>
          Mevcut: <b>Patch {PATCH}</b> ({DATA.champions.length} şampiyon,{' '}
          {DATA.champions.reduce((n, c) => n + c.skins.length, 0)} kostüm)
          <br />
          Yeni şampiyon veya kostüm çıktıysa buradan çek.
        </p>
        <button onClick={updateData} disabled={checking}
          className="rounded-xl px-4 py-2 font-bold disabled:opacity-50"
          style={{ background: 'var(--blue)', color: 'var(--on-gold)' }}>
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
          <p className="mt-2 text-sm" style={{ color: 'var(--danger-text)' }}>Hata: {dataResult.message}</p>
        )}
      </section>

      {/* Takma ad — meydan okuma linkinde görünür */}
      <section className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <h2 className="mb-1 font-bold" style={{ color: 'var(--gold-bright)' }}>Takma Ad</h2>
        <p className="mb-3 text-sm" style={{ color: 'var(--text-dim)' }}>
          Zamana Karşı'da arkadaşına "Meydan oku" linki gönderdiğinde bu ad görünür.
        </p>
        <div className="flex gap-2">
          <input value={nick} onChange={(e) => setNickState(e.target.value)} maxLength={20}
            placeholder="Örn: Ahmet"
            className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }} />
          <button onClick={saveNick} className="card-btn shrink-0 rounded-lg px-4 py-2 text-sm font-bold"
            style={{ background: 'var(--gold)', color: 'var(--on-gold)' }}>
            {nickSaved ? '✓' : 'Kaydet'}
          </button>
        </div>
      </section>

      {/* Ses */}
      <section className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <h2 className="mb-1 font-bold" style={{ color: 'var(--gold-bright)' }}>Ses</h2>
        <p className="mb-3 text-sm" style={{ color: 'var(--text-dim)' }}>
          Doğru/yanlış tahminlerde kısa efektler çalar. Replik modundaki seslendirme bundan bağımsızdır.
        </p>
        <button onClick={() => { const on = !sfx; setSfx(on); setSfxEnabled(on); if (on) playCorrect() }}
          className="card-btn rounded-xl border px-4 py-2 text-sm font-semibold"
          style={{ borderColor: sfx ? 'var(--gold)' : 'var(--border)', color: sfx ? 'var(--gold)' : 'var(--text-dim)' }}>
          {sfx ? '🔊 Ses efektleri açık' : '🔇 Ses efektleri kapalı'}
        </button>
      </section>

      {/* Yedekleme + sıfırlama */}
      <section className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <h2 className="mb-1 font-bold" style={{ color: 'var(--gold-bright)' }}>İlerleme</h2>
        <p className="mb-3 text-sm" style={{ color: 'var(--text)' }}>
          Rozetler, seriler, rekorlar ve istatistikler <b>yalnız bu cihazda</b> saklanır.
          Telefon değiştirirken ya da tarayıcı verisi temizlenmeden önce yedek al.
        </p>

        <div className="flex flex-wrap gap-2">
          <button onClick={downloadBackup} className="card-btn rounded-xl px-4 py-2 text-sm font-bold"
            style={{ background: 'var(--gold)', color: 'var(--on-gold)' }}>
            ⬇ Yedek al
          </button>
          <button onClick={() => fileRef.current?.click()} className="card-btn rounded-xl border px-4 py-2 text-sm font-bold"
            style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
            ⬆ Yedeği yükle
          </button>
          {/* Dosya seçici gizli: kendi butonumuzun görünümünü koruyoruz */}
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onBackupFile} className="hidden" />
        </div>

        {importMsg && (
          <p className="mt-2 text-sm" style={{ color: importMsg.ok ? 'var(--correct)' : 'var(--danger-text)' }}>
            {importMsg.text}
          </p>
        )}

        <hr className="my-4" style={{ borderColor: 'var(--border)' }} />

        <button onClick={resetProgress} className="rounded-xl border px-4 py-2 text-sm font-semibold"
          style={{ borderColor: 'var(--wrong)', color: 'var(--danger-text)' }}>
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
