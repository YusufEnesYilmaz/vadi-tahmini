import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { applyBackup, clearProgress, downloadBackup } from '../game/backup'
import { getNick, setNick, getPlayerId } from '../game/challenge'
import { PATCH } from '../game/data'
import { getDifficulty } from '../game/difficulty'
import { godMode, godModeAvailable, setGodMode } from '../game/dev'
import {
  getVolume,
  playGarenUltSound,
  setSfxEnabled,
  setVolume,
  sfxEnabled,
  updateActiveGarenVolume,
  warmupGarenAudio,
} from '../game/sfx'
import { updateLeaderboardNick } from '../game/supabase'
import { applyUpdate, useUpdateAvailable } from '../game/pwaUpdate'
import Achievements from './Achievements'
import CalendarModal from './CalendarModal'
import Changelog from './Changelog'
import HowTo from './HowTo'
import Leaderboard from './Leaderboard'
import Stats from './Stats'

function SectionHead({
  icon,
  title,
  detail,
  right,
}: {
  icon: string
  title: string
  detail?: string
  right?: ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl"
        style={{
          background: 'linear-gradient(180deg, rgba(var(--gold-rgb), 0.18), rgba(var(--hextech-rgb), 0.14))',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 24px -14px rgba(var(--hextech-rgb), 0.9)',
        }}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--gold-bright)' }}>
              {title}
            </h2>
            {detail && (
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                {detail}
              </p>
            )}
          </div>
          {right}
        </div>
      </div>
    </div>
  )
}

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className="inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors"
      style={{
        background: on ? 'linear-gradient(180deg, rgba(var(--gold-rgb), 0.92), rgba(var(--gold-rgb), 0.72))' : 'rgba(var(--bg-rgb), 0.72)',
        border: `1px solid ${on ? 'rgba(var(--gold-rgb), 0.95)' : 'rgba(var(--gold-rgb), 0.18)'}`,
        boxShadow: on
          ? '0 0 18px -10px rgba(var(--hextech-rgb), 0.95), inset 0 1px 0 rgba(255,255,255,0.2)'
          : 'inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <span
        className="block h-[19px] w-[19px] rounded-full"
        style={{
          background: on ? 'var(--on-gold)' : 'var(--text-dim)',
          marginLeft: on ? '24px' : '4px',
        }}
      />
    </button>
  )
}

function ShortcutCard({
  icon,
  title,
  desc,
  accent,
  onClick,
}: {
  icon: string
  title: string
  desc: string
  accent: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="card-btn settings-shortcut-card group flex h-full min-h-[144px] flex-col items-start justify-between rounded-[24px] border p-4 text-left"
      style={{
        borderColor: 'rgba(var(--gold-rgb), 0.16)',
        background: `linear-gradient(160deg, rgba(var(--bg-card-rgb), 0.82), rgba(var(--bg-rgb), 0.72)), radial-gradient(circle at 100% 0, ${accent}, transparent 44%)`,
      }}
    >
      <span
        className="grid h-12 w-12 place-items-center rounded-2xl text-2xl shadow-inner transition-transform duration-300 group-hover:scale-110"
        style={{
          background: 'rgba(var(--bg-rgb), 0.56)',
          color: 'var(--gold-bright)',
          border: '1px solid rgba(var(--gold-rgb), 0.16)',
        }}
        aria-hidden
      >
        {icon}
      </span>
      <span className="block min-w-0">
        <span className="block text-base font-bold tracking-tight" style={{ color: 'var(--gold-bright)' }}>
          {title}
        </span>
        <span className="mt-1 block text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
          {desc}
        </span>
      </span>
      <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--hextech)' }}>
        Aç →
      </span>
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
  const [changelog, setChangelog] = useState(false)
  const [howToOpen, setHowToOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [achievementsOpen, setAchievementsOpen] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [god, setGod] = useState(godMode)
  const updateReady = useUpdateAvailable()
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    warmupGarenAudio()
  }, [])

  function changeVolume(newVolPct: number) {
    const nextVolume = newVolPct / 100
    setVolState(newVolPct)
    setVolume(nextVolume)
    updateActiveGarenVolume(nextVolume)
    if (sfx) playGarenUltSound()
  }

  async function forceUpdateApp() {
    setUpdating(true)
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          await registration.unregister()
        }
        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map((key) => caches.delete(key)))
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
    window.setTimeout(() => setNickSaved(false), 2000)
  }

  function resetProgress() {
    if (!confirm('Tüm istatistik ve ilerleme silinecek. Emin misin?')) return
    clearProgress()
    location.reload()
  }

  async function onBackupFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!confirm('Yedek yüklenecek ve bu cihazdaki mevcut ilerlemenin YERİNE geçecek. Devam edilsin mi?')) return

    const result = applyBackup(await file.text())
    if (result.ok) {
      setImportMsg({ ok: true, text: `✓ ${result.count} kayıt geri yüklendi. Sayfa yenileniyor...` })
      window.setTimeout(() => location.reload(), 1500)
      return
    }

    setImportMsg({ ok: false, text: result.error })
  }

  const currentNick = nick.trim() || getNick() || 'Anonim'

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="settings-scene-bg absolute inset-0" />
        <div className="settings-scene-overlay absolute inset-0" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-4 px-3.5 pb-10 pt-3 sm:gap-5 sm:px-4 sm:pt-7">
        <header className="settings-shell panel overflow-hidden rounded-[30px] border px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={onExit}
              className="card-btn inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold"
              style={{ borderColor: 'rgba(var(--gold-rgb), 0.18)', color: 'var(--text)' }}
              aria-label="Menüye dön"
            >
              <span aria-hidden>←</span>
              <span>Menü</span>
            </button>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className="rounded-full border px-3 py-1 font-semibold"
                style={{
                  borderColor: updateReady ? 'rgba(var(--gold-rgb), 0.46)' : 'rgba(var(--gold-rgb), 0.18)',
                  background: updateReady ? 'rgba(var(--gold-rgb), 0.12)' : 'rgba(var(--bg-rgb), 0.48)',
                  color: updateReady ? 'var(--gold-bright)' : 'var(--text-dim)',
                }}
              >
                {updateReady ? 'Yeni sürüm hazır' : `Patch ${PATCH}`}
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: 'var(--gold-bright)' }}>
                Ayarlar
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-[15px]" style={{ color: 'var(--text)' }}>
                Rehber, istatistikler, başarımlar, sıralama ve takvim artık burada tek sahnede toplanır.
                Aşağıda menü; altında ise hesap, ses, ilerleme, sürüm ve geliştirici ayarları var.
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {[
                { label: 'Takma Ad', value: currentNick, tone: 'rgba(var(--gold-rgb), 0.14)' },
                { label: 'Durum', value: updateReady ? 'Güncelleme var' : 'Güncel', tone: 'rgba(var(--accent-done-rgb), 0.14)' },
              ].map((chip) => (
                <div
                  key={chip.label}
                  className="rounded-2xl border px-3.5 py-3"
                  style={{
                    borderColor: 'rgba(var(--gold-rgb), 0.16)',
                    background: `linear-gradient(180deg, rgba(var(--bg-rgb), 0.58), rgba(var(--bg-card-rgb), 0.76)), radial-gradient(circle at 100% 0, ${chip.tone}, transparent 50%)`,
                  }}
                >
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-dim)' }}>
                    {chip.label}
                  </span>
                  <span className="mt-1 block truncate text-sm font-bold" style={{ color: 'var(--gold-bright)' }}>
                    {chip.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </header>

        <section className="settings-shell settings-menu-shell panel overflow-hidden rounded-[30px] border px-4 py-4 sm:px-5 sm:py-5">
          <div
            className="pointer-events-none absolute inset-[1px] overflow-hidden rounded-[29px]"
            style={{ zIndex: 0 }}
            aria-hidden
          >
            <div className="settings-menu-scene-bg absolute inset-0" />
            <div className="settings-menu-scene-overlay absolute inset-0" />
          </div>

          <div className="relative">
            <SectionHead
            icon="🎮"
            title="Menü"
            detail="Nasıl Oynanır, İstatistikler, Başarımlar, Sıralama ve Takvim buradan açılır."
          />

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ShortcutCard
              icon="❔"
              title="Nasıl Oynanır"
              desc="Modları, ipuçlarını ve mini oyun kurallarını yeniden gözden geçir."
              accent="rgba(var(--gold-rgb), 0.18)"
              onClick={() => setHowToOpen(true)}
            />
            <ShortcutCard
              icon="📊"
              title="İstatistikler"
              desc="Serileri, rekorları ve mod bazlı performansını tek pencerede gör."
              accent="rgba(var(--hextech-rgb), 0.22)"
              onClick={() => setStatsOpen(true)}
            />
            <ShortcutCard
              icon="🏆"
              title="Başarımlar"
              desc="Rozet vitrini, ilerleme çubuğu ve kategori bazlı tamamlanma durumu."
              accent="rgba(var(--gold-glow-rgb), 0.2)"
              onClick={() => setAchievementsOpen(true)}
            />
            <ShortcutCard
              icon="🥇"
              title="Sıralama"
              desc="Günlük ve zamana karşı liderlik tablolarını aynı yerden aç."
              accent="rgba(var(--accent-endless-rgb), 0.18)"
              onClick={() => setLeaderboardOpen(true)}
            />
            <ShortcutCard
              icon="📅"
              title="Takvim"
              desc="Geçmiş günlük cevapları ve tamamlama takibini hızlıca incele."
              accent="rgba(var(--accent-done-rgb), 0.18)"
              onClick={() => setCalendarOpen(true)}
            />
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <section className="settings-shell panel rounded-[28px] border p-4 sm:p-5">
              <SectionHead
                icon="👤"
                title="Takma Ad"
                detail="Meydan oku linkinde ve sıralamada görünür."
              />

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  value={nick}
                  onChange={(event) => setNickState(event.target.value)}
                  maxLength={20}
                  placeholder="Örn: Ahmet"
                  className="settings-input min-w-0 flex-1 rounded-2xl border px-4 py-3 text-sm outline-none"
                  style={{
                    background: 'rgba(var(--bg-rgb), 0.54)',
                    borderColor: 'rgba(var(--gold-rgb), 0.16)',
                    color: 'var(--text)',
                  }}
                />
                <button onClick={saveNick} className="btn-gold shrink-0 rounded-2xl px-5 py-3 text-sm font-bold">
                  {nickSaved ? 'Kaydedildi' : 'Kaydet'}
                </button>
              </div>
            </section>

            <section className="settings-shell panel rounded-[28px] border p-4 sm:p-5">
              <SectionHead
                icon="🔊"
                title="Ses & Efektler"
                detail="Tahmin, arayüz ve replik efektlerini yönet."
                right={
                  <Toggle
                    on={sfx}
                    label="Ses efektleri"
                    onToggle={() => {
                      const next = !sfx
                      setSfx(next)
                      setSfxEnabled(next)
                      if (next) playGarenUltSound()
                    }}
                  />
                }
              />

              {sfx ? (
                <div
                  className="mt-4 rounded-[24px] border p-4"
                  style={{
                    borderColor: 'rgba(var(--gold-rgb), 0.14)',
                    background: 'linear-gradient(180deg, rgba(var(--bg-rgb), 0.54), rgba(var(--bg-card-rgb), 0.7))',
                  }}
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold" style={{ color: 'var(--text)' }}>
                      Ses Seviyesi
                    </span>
                    <span className="font-bold" style={{ color: 'var(--gold-bright)' }}>
                      %{vol}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={vol}
                    onPointerDown={() => {
                      if (sfx) playGarenUltSound()
                    }}
                    onChange={(event) => changeVolume(Number(event.target.value))}
                    className="settings-slider mt-4 w-full cursor-pointer accent-amber-400"
                  />
                  <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                    Kaydırıcı hareket ettikçe aktif Garen efekti aynı anda güncellenir.
                  </p>
                </div>
              ) : (
                <p className="mt-4 rounded-[24px] border px-4 py-3 text-sm" style={{ borderColor: 'rgba(var(--gold-rgb), 0.14)', color: 'var(--text-dim)' }}>
                  Kapalı — tahmin ve arayüz sesleri çalmaz.
                </p>
              )}
            </section>

            <section className="settings-shell panel rounded-[28px] border p-4 sm:p-5">
              <SectionHead
                icon="💾"
                title="İlerleme"
                detail="Rozet, seri, rekor ve istatistikler yalnız bu cihazda saklanır. Cihaz değiştirmeden veya tarayıcı verisini temizlemeden önce yedek al."
              />

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button onClick={downloadBackup} className="btn-gold rounded-2xl px-4 py-3 text-sm font-bold">
                  ↓ Yedek al
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="card-btn rounded-2xl border px-4 py-3 text-sm font-bold"
                  style={{ borderColor: 'rgba(var(--gold-rgb), 0.42)', color: 'var(--gold)' }}
                >
                  ↑ Yedeği yükle
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={onBackupFile}
                  className="hidden"
                />
              </div>

              {importMsg && (
                <p className="mt-3 text-sm" style={{ color: importMsg.ok ? 'var(--correct)' : 'var(--danger-text)' }}>
                  {importMsg.text}
                </p>
              )}

              <div className="mt-4 h-px" style={{ background: 'linear-gradient(90deg, rgba(var(--gold-rgb), 0.24), transparent)' }} />

              <button
                onClick={resetProgress}
                className="mt-4 w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors"
                style={{ borderColor: 'rgba(var(--danger-text-rgb), 0.34)', color: 'var(--danger-text)' }}
              >
                🗑 Tüm ilerlemeyi sıfırla
              </button>
            </section>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <section
              className="settings-shell panel rounded-[28px] border p-4 sm:p-5"
              style={{ borderColor: updateReady ? 'rgba(var(--gold-rgb), 0.48)' : undefined }}
            >
              <SectionHead
                icon="⬆️"
                title="Sürüm"
                detail={updateReady ? 'Yeni sürüm arka planda hazır. İlerleme ve kayıtlar korunur.' : 'Yeni sürüm çıktığında burada ve menüdeki Ayarlar rozetinde bildirilir.'}
                right={
                  !updateReady ? (
                    <span
                      className="rounded-full border px-3 py-1 text-xs font-semibold"
                      style={{
                        borderColor: 'rgba(var(--accent-done-rgb), 0.32)',
                        background: 'rgba(var(--accent-done-rgb), 0.1)',
                        color: 'var(--accent-done)',
                      }}
                    >
                      Güncel
                    </span>
                  ) : undefined
                }
              />

              {updateReady ? (
                <div
                  className="anim-pop mt-4 rounded-[24px] border p-4"
                  style={{
                    borderColor: 'rgba(var(--gold-rgb), 0.44)',
                    background: 'linear-gradient(180deg, rgba(var(--gold-rgb), 0.12), rgba(var(--bg-card-rgb), 0.68))',
                  }}
                >
                  <p className="text-sm font-bold" style={{ color: 'var(--gold-bright)' }}>
                    Yeni sürüm hazır
                  </p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text)' }}>
                    Uygulamak için yeniden başlat. İlerlemen, rozetlerin ve rekorların korunur.
                  </p>
                  <button onClick={() => void applyUpdate()} className="btn-gold mt-3 w-full rounded-2xl px-4 py-3 text-sm font-bold">
                    Güncelle ve yeniden başlat
                  </button>
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => setChangelog(true)}
                  className="card-btn w-full rounded-2xl border px-4 py-3 text-sm font-semibold"
                  style={{ borderColor: 'rgba(var(--gold-rgb), 0.28)', color: 'var(--gold-bright)' }}
                >
                  🆕 Yenilikleri gör
                </button>

                <button
                  onClick={forceUpdateApp}
                  disabled={updating}
                  className="card-btn w-full rounded-2xl border px-4 py-3 text-sm font-semibold disabled:opacity-50"
                  style={{ borderColor: 'rgba(var(--gold-rgb), 0.16)', color: 'var(--text-dim)' }}
                >
                  {updating ? 'Önbellek temizleniyor...' : 'Elle denetle ve önbelleği temizle'}
                </button>
              </div>
            </section>

            <section className="settings-shell panel rounded-[28px] border p-4 sm:p-5">
              <SectionHead
                icon="🛠"
                title="Geliştirici"
                detail={
                  godModeAvailable
                    ? 'Açıkken Günlük, Kelime ve Bingo kilitlenmez; her giriş taze başlar.'
                    : 'Bu bölüm yalnız localhost geliştirme ortamında etkinleşir; canlıda kapalı kalır.'
                }
                right={
                  godModeAvailable ? (
                    <Toggle
                      on={god}
                      label="Geliştirici modu"
                      onToggle={() => {
                        const next = !god
                        setGod(next)
                        setGodMode(next)
                      }}
                    />
                  ) : (
                    <span
                      className="rounded-full border px-3 py-1 text-xs font-semibold"
                      style={{
                        borderColor: 'rgba(var(--gold-rgb), 0.16)',
                        background: 'rgba(var(--bg-rgb), 0.48)',
                        color: 'var(--text-dim)',
                      }}
                    >
                      Kilitli
                    </span>
                  )
                }
              />

              <div
                className="mt-4 rounded-[24px] border p-4 text-sm leading-relaxed"
                style={{
                  borderColor: god && godModeAvailable ? 'rgba(var(--gold-rgb), 0.34)' : 'rgba(var(--gold-rgb), 0.14)',
                  background: 'linear-gradient(180deg, rgba(var(--bg-rgb), 0.54), rgba(var(--bg-card-rgb), 0.72))',
                  color: 'var(--text)',
                }}
              >
                {godModeAvailable ? (
                  <>
                    <p>
                      Yalnız <b>localhost</b>'ta görünür ve canlıya çıkmaz.
                    </p>
                    <p className="mt-2" style={{ color: 'var(--text-dim)' }}>
                      Durum: <b style={{ color: god ? 'var(--gold-bright)' : 'var(--text)' }}>{god ? 'Açık' : 'Kapalı'}</b>
                    </p>
                  </>
                ) : (
                  <p style={{ color: 'var(--text-dim)' }}>
                    Yerel geliştirme sunucusuna geçildiğinde günlük kilitlerini gevşeten geçici anahtar burada görünür.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>

        <p className="px-1 text-center text-[11px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
          Patch {PATCH} · Uygulama otomatik güncellenir.<br />
          Vadi Tahmini, Riot Games ile ilişkili değildir. Şampiyon verileri ve görseller Riot Games'in
          Data Dragon servisinden gelir.
        </p>

        {changelog && <Changelog onClose={() => setChangelog(false)} />}
        {howToOpen && <HowTo onClose={() => setHowToOpen(false)} />}
        {statsOpen && <Stats initialDifficulty={getDifficulty()} onClose={() => setStatsOpen(false)} />}
        {achievementsOpen && <Achievements onClose={() => setAchievementsOpen(false)} />}
        {leaderboardOpen && <Leaderboard onClose={() => setLeaderboardOpen(false)} />}
        {calendarOpen && <CalendarModal onClose={() => setCalendarOpen(false)} />}
      </div>
    </>
  )
}
