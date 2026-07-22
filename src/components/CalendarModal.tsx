import { useEffect } from 'react'
import DailyCalendar from './DailyCalendar'

interface Props {
  onClose: () => void
}

/**
 * Günlük takvimi kendi penceresinde gösterir. Eskiden İstatistik ekranının
 * günlük sekmesine gömülüydü ama kompakt istatistik görünümünü şişiriyordu
 * (kullanıcı isteği, 2026-07-22) — menüdeki 📅 butonundan ayrı modal olarak açılır.
 * DailyCalendar'ın kendisi değişmedi; burada yalnız sarılıyor.
 */
export default function CalendarModal({ onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 sm:items-center ovl"
      style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="anim-pop my-auto w-full max-w-md rounded-2xl border p-4 panel"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Günlük takvim">

        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold-bright)' }}>📅 Günlük Takvim</h2>
          <button onClick={onClose} className="card-btn rounded-lg border px-2.5 py-1 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            Kapat
          </button>
        </div>

        <div className="mt-3">
          <DailyCalendar />
        </div>
      </div>
    </div>
  )
}
