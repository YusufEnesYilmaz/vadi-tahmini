import { useEffect, useRef, useState } from 'react'
import { applyBackup, clearProgress, downloadBackup } from '../game/backup'
import { getNick, setNick, getPlayerId } from '../game/challenge'
import { PATCH } from '../game/data'
import { getVolume, playGarenUltSound, setSfxEnabled, setVolume, sfxEnabled, updateActiveGarenVolume, warmupGarenAudio } from '../game/sfx'
import { updateLeaderboardNick } from '../game/supabase'
import { applyUpdate, useUpdateAvailable } from '../game/pwaUpdate'
import { godMode, godModeAvailable, setGodMode } from '../game/dev'

/** Bölüm başlığı — dairesel ikon rozeti + başlık + (opsiyonel) sağda kontrol/durum */
function SectionHead({ icon, title, right }: { icon: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base"
        style={{ background: 'var(--gold-soft)' }} aria-hidden>{icon}</span>
      <h2 className="flex-1 font-bold" style={{ color: 'var(--gold-bright)' }}>{title}</h2>
      {right}
    </div>
  )
}

/**
 * Aç/kapa anahtarı — token'lardan, iOS tarzı switch (role=switch, erişilebilir).
 * Knob konumu `margin-left` ile (transform DEĞİL — Tailwind v4'ün transform/translate
 * sistemi bu elemanda inline transform'u eziyordu, tarayıcıda ölçüldü).
 * Knob'da transition YOK: `transition-all`/`transition-transform` bu elemanda margin'i
 * ESKİ değerde takılı tutuyordu (knob tıklayınca hiç kaymıyordu, ölçüldü) — knob konumu
 * anında oturur. Yumuşak geçiş track renginden gelir (butonun `transition-colors`'ı).
 */
function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onToggle}
      className="inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
      style={{
        background: on ? 'var(--gold)' : 'var(--bg-input)',
        border: `1px solid ${on ? 'var(--gold-bright)' : 'var(--border)'}`,
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
      }}>
      <span className="block h-[18px] w-[18px] rounded-full"
        style={{ background: on ? 'var(--on-gold)' : 'var(--text-dim)', marginLeft: on ? '23px' : '3px' }} />
    </button>
  )
}

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
    <div className="mx-auto flex w-full max-w-md flex-col gap-3.5 px-4 pb-10 pt-6">
      {/* Üst bar: geri + ⚙️ rozet + başlık */}
      <div className="flex items-center gap-3">
        <button onClick={onExit} className="card-btn shrink-0 rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }} aria-label="Menüye dön">
          ←
        </button>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl"
          style={{ background: 'var(--gold-soft)', boxShadow: '0 0 20px -4px rgba(var(--gold-glow-rgb),0.5)' }} aria-hidden>⚙️</span>
        <h1 className="font-display text-2xl font-bold leading-tight" style={{ color: 'var(--gold-bright)' }}>Ayarlar</h1>
      </div>

      {/* Takma ad */}
      <section className="rounded-2xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}>
        <SectionHead icon="👤" title="Takma Ad" />
        <p className="mb-3 mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>
          Meydan oku linkinde ve sıralamada görünür.
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

      {/* Ses — anahtar başlıkta, seviye açıkken görünür */}
      <section className="rounded-2xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}>
        <SectionHead icon="🔊" title="Ses & Efektler"
          right={<Toggle on={sfx} label="Ses efektleri"
            onToggle={() => { const on = !sfx; setSfx(on); setSfxEnabled(on); if (on) playGarenUltSound() }} />} />

        {sfx ? (
          <div className="mt-3 flex flex-col gap-2 rounded-lg border p-3" style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
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
        ) : (
          <p className="mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>Kapalı — tahmin ve arayüz sesleri çalmaz.</p>
        )}
      </section>

      {/* İlerleme — yedek al / yükle / sıfırla */}
      <section className="rounded-2xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}>
        <SectionHead icon="💾" title="İlerleme" />
        <p className="mb-3 mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>
          Rozet, seri, rekor ve istatistikler <b style={{ color: 'var(--text)' }}>yalnız bu cihazda</b> saklanır.
          Cihaz değiştirmeden ya da tarayıcı verisini temizlemeden önce yedek al.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={downloadBackup} className="btn-gold rounded-lg px-4 py-2 text-sm font-bold">
            ⬇ Yedek al
          </button>
          <button onClick={() => fileRef.current?.click()} className="card-btn rounded-lg border px-4 py-2 text-sm font-bold"
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

        <hr className="my-3" style={{ borderColor: 'var(--border)' }} />

        <button onClick={resetProgress} className="w-full rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
          style={{ borderColor: 'var(--wrong)', color: 'var(--danger-text)' }}>
          🗑 Tüm ilerlemeyi sıfırla
        </button>
      </section>

      {/* Sürüm & güncelleme */}
      <section className="rounded-2xl border p-4"
        style={{ background: 'var(--bg-card)', borderColor: updateReady ? 'var(--gold)' : 'var(--border)', boxShadow: 'var(--shadow-card)' }}>
        <SectionHead icon="⬆️" title="Sürüm"
          right={!updateReady ? <span className="text-xs font-semibold" style={{ color: 'var(--accent-done)' }}>✓ Güncel</span> : undefined} />

        {updateReady ? (
          /* Yeni sürüm arka planda indi, uygulanmayı bekliyor */
          <div className="anim-pop mb-3 mt-3 rounded-xl border p-3"
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
          <p className="mb-3 mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>
            Yeni sürüm çıkınca burada ve menüdeki Ayarlar baloncuğunda bildirilir.
          </p>
        )}

        {/* Elle sıfırlama: sinyal bir sebeple gelmezse ya da bir şey takılırsa son çare */}
        <button onClick={forceUpdateApp} disabled={updating}
          className="card-btn w-full rounded-lg border px-4 py-2 text-xs font-semibold disabled:opacity-50"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
          {updating ? '🔄 Güncelleniyor...' : '🔄 Elle denetle ve önbelleği temizle'}
        </button>
      </section>

      {/* Geliştirici modu — YALNIZ yerel dev sunucusunda görünür (godModeAvailable) */}
      {godModeAvailable && (
        <section className="rounded-2xl border p-4"
          style={{ background: 'var(--bg-card)', borderColor: god ? 'var(--gold)' : 'var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <SectionHead icon="🛠" title="Geliştirici Modu"
            right={<Toggle on={god} label="Geliştirici modu"
              onToggle={() => { const on = !god; setGod(on); setGodMode(on) }} />} />
          <p className="mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>
            Açıkken <b style={{ color: 'var(--text)' }}>Günlük, Kelime ve Bingo</b> kilitlenmez — her giriş taze başlar.
            Yalnız <b style={{ color: 'var(--text)' }}>localhost</b>'ta görünür; canlıda asla çalışmaz.
          </p>
        </section>
      )}

      <p className="text-center text-[11px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
        Patch {PATCH} · Uygulama otomatik güncellenir.<br />
        Vadi Tahmini, Riot Games ile ilişkili değildir. Şampiyon verileri ve görseller Riot Games'in
        Data Dragon servisinden gelir.
      </p>
    </div>
  )
}
