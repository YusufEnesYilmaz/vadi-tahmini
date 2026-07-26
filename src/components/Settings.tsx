import { useEffect, useRef, useState, type CSSProperties, type ChangeEvent, type ReactNode } from 'react'
import { applyBackup, clearProgress, downloadBackup } from '../game/backup'
import { getNick, setNick, getPlayerId } from '../game/challenge'
import { PATCH } from '../game/data'
import ReportModal from './ReportModal'
import type { ReportKind } from '../game/report'
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
import Leaderboard from './Leaderboard'
import Stats from './Stats'
import { useModalFocusTrap } from './useModalFocusTrap'

function SectionHead({
  icon,
  title,
  detail,
  accentRgb = 'var(--gold-rgb)',
  right,
}: {
  icon: ReactNode
  title: string
  detail?: string
  accentRgb?: string
  right?: ReactNode
}) {
  return (
    <div
      className="settings-section-head flex items-start gap-3"
      style={
        {
          '--sec-accent-rgb': accentRgb,
        } as CSSProperties
      }
    >
      <span
        className="settings-section-badge grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
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

/** Bölüm başlığı çizgi ikonları — emoji yerine (OS'e göre değişip sıkışık/tutarsız duruyordu).
 *  Rozetin `color`'u accent olduğu için `stroke=currentColor` accent rengini alır. */
const SECTION_GLYPHS = {
  menu: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.6" />
      <rect x="13" y="4" width="7" height="7" rx="1.6" />
      <rect x="4" y="13" width="7" height="7" rx="1.6" />
      <rect x="13" y="13" width="7" height="7" rx="1.6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9.5v5h3l4.5 3.5v-12L7 9.5H4Z" />
      <path d="M15.4 9.2a4 4 0 0 1 0 5.6" />
      <path d="M18 6.6a7.5 7.5 0 0 1 0 10.8" />
    </>
  ),
  save: (
    <>
      <path d="M5 4.5h10.4l3.1 3.1V19a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5Z" />
      <path d="M8 4.5v4h6v-4" />
      <rect x="8" y="12" width="8" height="5.5" rx="0.7" />
    </>
  ),
  version: (
    <>
      <path d="M4.6 12a7.4 7.4 0 0 1 12.7-5.2L20 9" />
      <path d="M20 4.6V9h-4.4" />
      <path d="M19.4 12a7.4 7.4 0 0 1-12.7 5.2L4 15" />
      <path d="M4 19.4V15h4.4" />
    </>
  ),
  dev: (
    <>
      <path d="M9 8 5 12l4 4" />
      <path d="M15 8l4 4-4 4" />
      <path d="M13.2 5.5 10.8 18.5" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.6" />
      <path d="M4 17.5 9.5 12l3.5 3.5L16 12l4 4.5" />
    </>
  ),
} as const

function SectionGlyph({ name }: { name: keyof typeof SECTION_GLYPHS }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      {SECTION_GLYPHS[name]}
    </svg>
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

/** Menü hub kartlarının çizgi ikonları — emoji yerine (OS'e göre değişip düz duruyordu).
 *  `currentColor` ile badge'in accent rengini alır. */
const SHORTCUT_GLYPHS = {
  howto: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9.3a2.8 2.8 0 0 1 5.4 1c0 1.9-2.6 2.3-2.6 3.7" />
      <circle cx="12" cy="17.3" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  stats: (
    <>
      <path d="M4 20h16" />
      <rect x="6" y="12.5" width="3.2" height="5.5" rx="0.7" />
      <rect x="10.4" y="7.5" width="3.2" height="10.5" rx="0.7" />
      <rect x="14.8" y="10" width="3.2" height="8" rx="0.7" />
    </>
  ),
  trophy: (
    <>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M8.6 13.7 7 22l5-3 5 3-1.6-8.3" />
      <path d="M12 6.2l1 2 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L9 8.5l2-.3z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 2.8v3.4" />
      <path d="M16 2.8v3.4" />
      <path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" />
    </>
  ),
} as const

function ShortcutGlyph({ name }: { name: keyof typeof SHORTCUT_GLYPHS }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      {SHORTCUT_GLYPHS[name]}
    </svg>
  )
}

function ShortcutCard({
  icon,
  title,
  desc,
  accentRgb,
  onClick,
  className = '',
}: {
  icon: ReactNode
  title: string
  desc: string
  accentRgb: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`card-btn settings-shortcut-card group flex h-full min-h-[156px] flex-col items-start justify-between gap-5 rounded-[26px] border p-4 text-left sm:p-5 ${className}`}
      style={
        {
          '--card-accent-rgb': accentRgb,
        } as CSSProperties
      }
    >
      <span className="flex w-full items-start gap-4">
        <span className="settings-shortcut-badge grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[20px]" aria-hidden>
          {icon}
        </span>
        <span className="block min-w-0 flex-1 pt-0.5">
          <span className="settings-shortcut-title block text-[1.02rem] font-bold tracking-tight">{title}</span>
          <span className="settings-shortcut-desc mt-1.5 block text-sm leading-6">{desc}</span>
        </span>
      </span>
      <span className="settings-shortcut-card__cta inline-flex items-center gap-2 rounded-full px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.22em]">
        <span>Aç</span>
        <span className="settings-shortcut-card__cta-arrow text-sm" aria-hidden>
          →
        </span>
      </span>
    </button>
  )
}

/** İndirilebilir Arcane duvar kağıtları — `public/`'teki üretilmiş arka planlar (hepsi yazı/karakter/watermark YOK). */
interface Wallpaper {
  file: string
  name: string
  slug: string
}

const WALLPAPERS: Wallpaper[] = [
  // Şampiyon esintili özel duvar kağıtları (bu oyun için üretildi)
  { file: '/hero-roster-test.png', name: 'Vadi Kadrosu', slug: 'vadi-kadrosu' },
  // Şövalye · Ezgi · Kâşif üçlüsü — her birinin 3 farklı kompozisyonu
  { file: '/wp-garen.png', name: 'Adaletin Kalkanı', slug: 'adaletin-kalkani' },
  { file: '/wp-garen-2.png', name: 'Şafak Muhafızı', slug: 'safak-muhafizi' },
  { file: '/wp-garen-3.png', name: 'Kılıç Yemini', slug: 'kilic-yemini' },
  { file: '/wp-seraphine.png', name: 'Yıldızların Ezgisi', slug: 'yildizlarin-ezgisi' },
  { file: '/wp-seraphine-2.png', name: 'Kristal Nota', slug: 'kristal-nota' },
  { file: '/wp-seraphine-3.png', name: 'Sahne Işıkları', slug: 'sahne-isiklari' },
  { file: '/wp-teemo.png', name: 'Orman Kâşifi', slug: 'orman-kasifi' },
  { file: '/wp-teemo-2.png', name: 'Mantar Tarlası', slug: 'mantar-tarlasi' },
  { file: '/wp-teemo-3.png', name: 'Küçük İzci', slug: 'kucuk-izci' },
  // Arcane esintili kadro (11 karakter, her birine 1 duvar kağıdı)
  { file: '/wp-jinx.png', name: 'Kaos Havai Fişeği', slug: 'kaos-havai-fisegi' },
  { file: '/wp-vi.png', name: 'Demir Yumruk', slug: 'demir-yumruk' },
  { file: '/wp-caitlyn.png', name: 'Keskin Nişan', slug: 'keskin-nisan' },
  { file: '/wp-ekko.png', name: 'Zaman Kıvılcımı', slug: 'zaman-kivilcimi' },
  { file: '/wp-jayce.png', name: 'Hextech Çekiç', slug: 'hextech-cekic' },
  { file: '/wp-viktor.png', name: 'Çelik Evrim', slug: 'celik-evrim' },
  { file: '/wp-heimerdinger.png', name: 'Mucit Atölyesi', slug: 'mucit-atolyesi' },
  { file: '/wp-singed.png', name: 'Zehirli Duman', slug: 'zehirli-duman' },
  { file: '/wp-warwick.png', name: 'Gölge Avcısı', slug: 'golge-avcisi' },
  { file: '/wp-ambessa.png', name: 'Savaş Lordu', slug: 'savas-lordu' },
  { file: '/wp-mel.png', name: 'Altın Işıltı', slug: 'altin-isilti' },
  // Oyun ekranlarının arka planları
  { file: '/mg-main.png', name: 'Hextech Arena', slug: 'hextech-arena' },
  { file: '/arcane-menu-bg.png', name: 'Zaun & Piltover', slug: 'zaun-piltover' },
  { file: '/card-endless.png', name: 'Sınırsız', slug: 'sinirsiz' },
  { file: '/card-daily.png', name: 'Günlük', slug: 'gunluk' },
  { file: '/card-timed.png', name: 'Zamana Karşı', slug: 'zamana-karsi' },
  { file: '/mg-wordle.png', name: 'Kelime · Rün Arşivi', slug: 'kelime' },
  { file: '/mg-bingo.png', name: 'Bingo', slug: 'bingo' },
  { file: '/mg-timeline.png', name: 'Zaman Tüneli', slug: 'zaman-tuneli' },
  { file: '/mg-hunt.png', name: 'Şampiyon Avı', slug: 'sampiyon-avi' },
  { file: '/mg-grid.png', name: 'Dokuz Kare', slug: 'dokuz-kare' },
  { file: '/mg-connections.png', name: 'Bağlantılar', slug: 'baglantilar' },
  { file: '/mg-counter.png', name: 'Kaç Tane?', slug: 'kac-tane' },
  { file: '/settings-bg.png', name: 'Hextech Atölye', slug: 'hextech-atolye' },
  { file: '/menu-section-bg.png', name: 'Hextech Geçidi', slug: 'hextech-gecidi' },
]

/**
 * Duvar kağıdı büyük önizlemesi. Izgaradaki kart görseli `object-cover` ile kırpıyor;
 * burada `object-contain` — amacı görselin TAMAMINI göstermek. İndirme bağlantısı da burada
 * (karttan buraya taşındı) ki tek tık indirmek yerine oyuncu önce görüp karar verebilsin.
 */
function WallpaperPreview({ wallpaper, onClose }: { wallpaper: Wallpaper; onClose: () => void }) {
  const dialogRef = useModalFocusTrap<HTMLDivElement>()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="ovl fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-5"
      style={{ background: 'var(--overlay)' }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="panel anim-pop my-auto w-full max-w-4xl rounded-[24px] border p-3 sm:p-4"
        style={{ background: 'var(--bg-card)', borderColor: 'rgba(var(--gold-rgb), 0.24)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${wallpaper.name} duvar kağıdı önizlemesi`}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display truncate text-lg font-bold" style={{ color: 'var(--gold-bright)' }}>
            {wallpaper.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="card-btn shrink-0 rounded-lg border px-2.5 py-1 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          >
            Kapat
          </button>
        </div>

        {failed ? (
          <p
            className="mt-3 rounded-2xl border px-4 py-8 text-center text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          >
            Görsel yüklenemedi. Duvar kağıtları çevrimiçi yüklenir — bağlantını kontrol edip tekrar dene.
          </p>
        ) : (
          <img
            src={wallpaper.file}
            alt={`${wallpaper.name} duvar kağıdı`}
            decoding="async"
            onError={() => setFailed(true)}
            className="mt-3 max-h-[74vh] w-full rounded-2xl border object-contain"
            style={{ borderColor: 'rgba(var(--gold-rgb), 0.14)', background: 'rgba(var(--bg-rgb), 0.6)' }}
          />
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
            vadi-tahmini-{wallpaper.slug}.png
          </span>
          <a
            href={wallpaper.file}
            download={`vadi-tahmini-${wallpaper.slug}.png`}
            className="btn-gold inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold"
          >
            <span aria-hidden>↓</span> İndir
          </a>
        </div>
      </div>
    </div>
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
  const [statsOpen, setStatsOpen] = useState(false)
  const [achievementsOpen, setAchievementsOpen] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportKind, setReportKind] = useState<ReportKind>('bug')
  const [preview, setPreview] = useState<Wallpaper | null>(null)
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
              <h1 className="text-shimmer font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Ayarlar
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-[15px]" style={{ color: 'var(--text)' }}>
                Rehber, istatistikler, başarımlar, sıralama ve takvim artık burada tek sahnede toplanır.
                Aşağıda menü; altında ise hesap, ses, ilerleme ve sürüm ayarları var.
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
              icon={<SectionGlyph name="menu" />}
              title="Menü"
              detail="İstatistikler, Başarımlar, Sıralama ve Takvim buradan açılır."
              accentRgb="var(--hextech-rgb)"
            />

            <div className="mt-4 grid gap-3 md:grid-cols-6 lg:gap-4">
              <ShortcutCard
                className="md:col-span-3"
                icon={<ShortcutGlyph name="stats" />}
                title="İstatistikler"
                desc="Serileri, rekorları ve mod bazlı performansını tek pencerede gör."
                accentRgb="var(--hextech-rgb)"
                onClick={() => setStatsOpen(true)}
              />
              <ShortcutCard
                className="md:col-span-3"
                icon={<ShortcutGlyph name="trophy" />}
                title="Başarımlar"
                desc="Rozet vitrini, ilerleme çubuğu ve kategori bazlı tamamlanma durumu."
                accentRgb="var(--gold-glow-rgb)"
                onClick={() => setAchievementsOpen(true)}
              />
              <ShortcutCard
                className="md:col-span-3"
                icon={<ShortcutGlyph name="medal" />}
                title="Sıralama"
                desc="Günlük ve zamana karşı liderlik tablolarını aynı yerden aç."
                accentRgb="var(--accent-endless-rgb)"
                onClick={() => setLeaderboardOpen(true)}
              />
              <ShortcutCard
                className="md:col-span-3"
                icon={<ShortcutGlyph name="calendar" />}
                title="Takvim"
                desc="Geçmiş günlük cevapları ve tamamlama takibini hızlıca incele."
                accentRgb="var(--accent-done-rgb)"
                onClick={() => setCalendarOpen(true)}
              />
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <section className="settings-shell panel rounded-[28px] border p-4 sm:p-5">
              <SectionHead
                icon={<SectionGlyph name="user" />}
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
                icon={<SectionGlyph name="volume" />}
                title="Ses & Efektler"
                detail="Tahmin, arayüz ve replik efektlerini yönet."
                accentRgb="var(--gold-glow-rgb)"
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
                </div>
              ) : (
                <p className="mt-4 rounded-[24px] border px-4 py-3 text-sm" style={{ borderColor: 'rgba(var(--gold-rgb), 0.14)', color: 'var(--text-dim)' }}>
                  Kapalı — tahmin ve arayüz sesleri çalmaz.
                </p>
              )}
            </section>

            <section className="settings-shell panel rounded-[28px] border p-4 sm:p-5">
              <SectionHead
                icon={<SectionGlyph name="save" />}
                title="İlerleme"
                detail="Rozet, seri, rekor ve istatistikler yalnız bu cihazda saklanır. Cihaz değiştirmeden veya tarayıcı verisini temizlemeden önce yedek al."
                accentRgb="var(--accent-endless-rgb)"
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
                icon={<SectionGlyph name="version" />}
                title="Sürüm"
                detail={updateReady ? 'Yeni sürüm arka planda hazır. İlerleme ve kayıtlar korunur.' : 'Yeni sürüm çıktığında burada ve menüdeki Ayarlar rozetinde bildirilir.'}
                accentRgb="var(--accent-done-rgb)"
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

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => { setReportKind('bug'); setReportOpen(true) }}
                    className="card-btn w-full rounded-2xl border px-4 py-3 text-sm font-semibold"
                    style={{ borderColor: 'rgba(var(--gold-rgb), 0.16)', color: 'var(--text-dim)' }}
                  >
                    🐛 Hata bildir
                  </button>
                  <button
                    onClick={() => { setReportKind('idea'); setReportOpen(true) }}
                    className="card-btn w-full rounded-2xl border px-4 py-3 text-sm font-semibold"
                    style={{ borderColor: 'rgba(var(--hextech-rgb), 0.24)', color: 'var(--hextech)' }}
                  >
                    💡 Öneri gönder
                  </button>
                </div>
              </div>
            </section>

            {/*
              Geliştirici bölümü YALNIZ yerel dev'de RENDER EDİLİR — canlıda kabuğu bile yok.
              `godModeAvailable` üretimde sabit `false` olduğu için bu blok ölü kod olarak elenir
              ve içindeki metinler pakete hiç girmez (dist grep ile doğrulandı).
            */}
            {godModeAvailable && (
              <section className="settings-shell panel rounded-[28px] border p-4 sm:p-5">
                <SectionHead
                  icon={<SectionGlyph name="dev" />}
                  title="Geliştirici"
                  detail="Açıkken Günlük, Kelime ve Bingo kilitlenmez; her giriş taze başlar."
                  accentRgb="var(--accent-timed-rgb)"
                  right={
                    <Toggle
                      on={god}
                      label="Geliştirici modu"
                      onToggle={() => {
                        const next = !god
                        setGod(next)
                        setGodMode(next)
                      }}
                    />
                  }
                />

                <div
                  className="mt-4 rounded-[24px] border p-4 text-sm leading-relaxed"
                  style={{
                    borderColor: god ? 'rgba(var(--gold-rgb), 0.34)' : 'rgba(var(--gold-rgb), 0.14)',
                    background: 'linear-gradient(180deg, rgba(var(--bg-rgb), 0.54), rgba(var(--bg-card-rgb), 0.72))',
                    color: 'var(--text)',
                  }}
                >
                  <p>
                    Yalnız <b>localhost</b>'ta görünür ve canlıya çıkmaz.
                  </p>
                  <p className="mt-2" style={{ color: 'var(--text-dim)' }}>
                    Durum: <b style={{ color: god ? 'var(--gold-bright)' : 'var(--text)' }}>{god ? 'Açık' : 'Kapalı'}</b>
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>

        <section className="settings-shell panel rounded-[28px] border p-4 sm:p-5">
          <SectionHead
            icon={<SectionGlyph name="image" />}
            title="Duvar Kağıtları"
            detail="Karta dokun, duvar kağıdını büyük gör ve indir. Görseller çevrimiçi yüklenir."
            accentRgb="var(--hextech-rgb)"
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WALLPAPERS.map((w) => (
              <button
                key={w.file}
                type="button"
                onClick={() => setPreview(w)}
                className="card-btn group relative block overflow-hidden rounded-2xl border text-left"
                style={{ borderColor: 'rgba(var(--gold-rgb), 0.18)' }}
                aria-label={`${w.name} duvar kağıdını büyük göster`}
              >
                <img
                  src={w.file}
                  loading="lazy"
                  decoding="async"
                  alt=""
                  className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span
                  className="pointer-events-none absolute inset-0 flex flex-col justify-end gap-1 p-3"
                  style={{ background: 'linear-gradient(180deg, transparent 38%, rgba(var(--bg-rgb), 0.88))' }}
                >
                  <span className="text-sm font-bold" style={{ color: 'var(--gold-bright)' }}>
                    {w.name}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--hextech)' }}>
                    <span aria-hidden>⤢</span> Büyüt
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <p className="px-1 text-center text-[11px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
          Patch {PATCH} · Uygulama otomatik güncellenir.<br />
          Vadi Tahmini, Riot Games ile ilişkili değildir. Şampiyon verileri ve görseller Riot Games'in
          Data Dragon servisinden gelir.
        </p>

        {changelog && <Changelog onClose={() => setChangelog(false)} />}
        {statsOpen && <Stats initialDifficulty={getDifficulty()} onClose={() => setStatsOpen(false)} />}
        {achievementsOpen && <Achievements onClose={() => setAchievementsOpen(false)} />}
        {leaderboardOpen && <Leaderboard onClose={() => setLeaderboardOpen(false)} />}
        {calendarOpen && <CalendarModal onClose={() => setCalendarOpen(false)} />}
        {reportOpen && <ReportModal context="Ayarlar" kind={reportKind} onClose={() => setReportOpen(false)} />}
        {preview && <WallpaperPreview wallpaper={preview} onClose={() => setPreview(null)} />}
      </div>
    </>
  )
}
