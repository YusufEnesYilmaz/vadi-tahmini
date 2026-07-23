import { useEffect, useRef, useState } from 'react'
import { applyBackup, clearProgress, downloadBackup } from '../game/backup'
import { getNick, setNick, getPlayerId } from '../game/challenge'
import { PATCH } from '../game/data'
import { getVolume, playGarenUltSound, setSfxEnabled, setVolume, sfxEnabled, updateActiveGarenVolume, warmupGarenAudio } from '../game/sfx'
import { updateLeaderboardNick } from '../game/supabase'
import { applyUpdate, useUpdateAvailable } from '../game/pwaUpdate'
import { godMode, godModeAvailable, setGodMode } from '../game/dev'

export default function Settings({ onExit }: { onExit: () => void }) {
  const [sfx, setSfx] = useState(sfxEnabled)
  const [vol, setVolState] = useState(() => Math.round(getVolume() * 100))
  const [nick, setNickState] = useState(getNick)
  const [nickSaved, setNickSaved] = useState(false)
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [updating, setUpdating] = useState(false)
  const updateReady = useUpdateAvailable()
  const [god, setGod] = useState(godMode)
  const fileRef = useRef<HTMLInputElement>(null)

  // Ses klibi burada (ve yalnız burada) çalıyor — ekran açılınca ısıt ki kaydırıcıya
  // dokunulduğunda gecikme olmasın. Açılışta değil BURADA: bu ekrana gelmek için
  // zaten tıklandı, yani tarayıcının otomatik oynatma politikası aşılmış oluyor.
  useEffect(() => { warmupGarenAudio() }, [])

  function changeVolume(newVolPct: number) {
    const v = newVolPct / 100
    setVolState(newVolPct)
    setVolume(v)
    updateActiveGarenVolume(v)
    if (sfx) playGarenUltSound()
  }

  async function forceUpdateApp() {
    setUpdating(true)
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const reg of registrations) {
          await reg.unregister()
        }
        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map((k) => caches.delete(k)))
        }
      } catch (err) {
        console.error('SW unregister/cache clear failed:', err)
      }
    }
    window.location.reload()
  }

  function saveNick() {
    const cleanNick = nick.trim()
    setNick(cleanNick)
    setNickState(getNick())
    setNickSaved(true)
    void updateLeaderboardNick(getPlayerId(), cleanNick)
    setTimeout(() => setNickSaved(false), 2000)
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
          <button onClick={saveNick} className="btn-gold shrink-0 rounded-lg px-4 py-2 text-sm font-bold">
            {nickSaved ? '✓' : 'Kaydet'}
          </button>
        </div>
      </section>

      {/* Ses */}
      <section className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <h2 className="mb-1 font-bold" style={{ color: 'var(--gold-bright)' }}>Ses & Efektler</h2>
        <p className="mb-3 text-sm" style={{ color: 'var(--text-dim)' }}>
          Doğru/yanlış tahminlerde ve ayarlarda ses efektleri çalar.
        </p>

        <div className="flex flex-col gap-3">
          <button onClick={() => { const on = !sfx; setSfx(on); setSfxEnabled(on); if (on) playGarenUltSound() }}
            className="card-btn rounded-xl border px-4 py-2 text-sm font-semibold transition-all"
            style={{ borderColor: sfx ? 'var(--gold)' : 'var(--border)', color: sfx ? 'var(--gold)' : 'var(--text-dim)' }}>
            {sfx ? '🔊 Ses Efektleri Açık' : '🔇 Ses Efektleri Kapalı'}
          </button>

          {sfx && (
            <div className="flex flex-col gap-2 rounded-lg border p-3" style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'var(--text)' }}>
                <span>🔉 Ses Seviyesi</span>
                <span style={{ color: 'var(--gold-bright)' }}>%{vol}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={vol}
                onPointerDown={() => { if (sfx) playGarenUltSound() }}
                onChange={(e) => changeVolume(Number(e.target.value))}
                className="w-full cursor-pointer accent-amber-400"
              />
            </div>
          )}
        </div>
      </section>

      {/* Güncelleme */}
      <section className="rounded-xl border p-4"
        style={{ background: 'var(--bg-card)', borderColor: updateReady ? 'var(--gold)' : 'var(--border)' }}>
        <h2 className="mb-1 font-bold" style={{ color: 'var(--gold-bright)' }}>Sürüm Güncelleme</h2>

        {updateReady ? (
          /* Yeni sürüm arka planda indi, uygulanmayı bekliyor */
          <div className="anim-pop mb-3 rounded-xl border p-3"
            style={{ borderColor: 'var(--gold)', background: 'var(--gold-soft)' }}>
            <p className="text-sm font-bold" style={{ color: 'var(--gold-bright)' }}>🎉 Yeni sürüm hazır!</p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-dim)' }}>
              Uygulamak için yeniden başlat. <b>İlerlemen, rozetlerin ve rekorların korunur.</b>
            </p>
            <button onClick={() => void applyUpdate()}
              className="btn-gold mt-2 w-full rounded-lg px-4 py-2 text-sm font-bold">
              ⬆ Güncelle ve yeniden başlat
            </button>
          </div>
        ) : (
          <p className="mb-3 text-sm" style={{ color: 'var(--text-dim)' }}>
            Uygulaman güncel. Yeni sürüm çıktığında burada otomatik bildirilir —
            ayrıca menüde Ayarlar butonunda altın bir baloncuk görürsün.
          </p>
        )}

        {/* Elle sıfırlama: sinyal bir sebeple gelmezse ya da bir şey takılırsa son çare */}
        <button onClick={forceUpdateApp} disabled={updating}
          className="card-btn rounded-xl border px-4 py-2 text-xs font-semibold disabled:opacity-50"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
          {updating ? '🔄 Güncelleniyor...' : '🔄 Elle denetle ve önbelleği temizle'}
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
          <button onClick={downloadBackup} className="btn-gold rounded-xl px-4 py-2 text-sm font-bold">
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

      {/* Geliştirici modu — YALNIZ yerel dev sunucusunda görünür (godModeAvailable) */}
      {godModeAvailable && (
        <section className="rounded-xl border p-4"
          style={{ background: 'var(--bg-card)', borderColor: god ? 'var(--gold)' : 'var(--border)' }}>
          <h2 className="mb-1 font-bold" style={{ color: 'var(--gold-bright)' }}>🛠 Geliştirici Modu</h2>
          <p className="mb-3 text-sm" style={{ color: 'var(--text-dim)' }}>
            Açıkken <b>Günlük, Kelime ve Bingo</b> kilitlenmez — her giriş taze başlar, istediğin kadar
            tekrar test edebilirsin. Bu bölüm ve etkisi yalnız <b>localhost</b> geliştirme sunucusunda
            görünür; canlı sürümde asla çalışmaz.
          </p>
          <button onClick={() => { const on = !god; setGod(on); setGodMode(on) }}
            className="card-btn rounded-xl border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: god ? 'var(--gold)' : 'var(--border)', color: god ? 'var(--gold)' : 'var(--text-dim)' }}>
            {god ? '🔓 God mode AÇIK — sınırsız tekrar' : '🔒 God mode kapalı'}
          </button>
        </section>
      )}

      <p className="text-center text-xs" style={{ color: 'var(--text-dim)' }}>
        Patch {PATCH} · Uygulama otomatik güncellenir.<br />
        Vadi Tahmini, Riot Games ile ilişkili değildir. Şampiyon verileri ve görseller Riot Games'in
        Data Dragon servisinden gelir.
      </p>
    </div>
  )
}
