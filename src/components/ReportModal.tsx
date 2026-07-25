import { useEffect, useState } from 'react'
import { useModalFocusTrap } from './useModalFocusTrap'
import { buildDiagnostic, reportMailtoUrl } from '../game/report'
import { submitReport, isLeaderboardEnabled } from '../game/supabase'

interface Props {
  /** Hangi ekrandan açıldı ("Ayarlar", "Çöküş"…) — rapora eklenir */
  context: string
  /** Varsa hata mesajı + stack (çöküş ekranı) — tanı metnine gömülür */
  detail?: string
  onClose: () => void
}

type Status = 'idle' | 'sending' | 'sent' | 'error'

/**
 * "Hata bildir" formu. Rapor SİTE ÜZERİNDEN Supabase'e (`vt_reports`) yazılır;
 * Supabase yoksa (yerel/backend kapalı) mailto yedeğine düşer.
 */
export default function ReportModal({ context, detail, onClose }: Props) {
  const dialogRef = useModalFocusTrap<HTMLDivElement>()
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function send() {
    if (status === 'sending') return
    // Supabase yoksa doğrudan mailto yedeğine düş
    if (!isLeaderboardEnabled) {
      window.location.href = reportMailtoUrl(context, message, detail)
      return
    }
    setStatus('sending')
    const ok = await submitReport(context, message.trim(), buildDiagnostic(context, detail))
    setStatus(ok ? 'sent' : 'error')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 sm:items-center ovl"
      style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div ref={dialogRef} className="anim-pop my-auto w-full max-w-md rounded-2xl border p-4 panel"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Hata bildir">

        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold-bright)' }}>🐛 Hata bildir</h2>
          <button onClick={onClose} className="card-btn rounded-lg border px-2.5 py-1 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            Kapat
          </button>
        </div>

        {status === 'sent' ? (
          <div className="mt-4 text-center">
            <div className="text-4xl">✅</div>
            <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--accent-done)' }}>Raporun gönderildi</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>Teşekkürler — sorunu bulmamıza yardımcı oldun.</p>
            <button onClick={onClose} className="btn-gold mt-4 w-full rounded-2xl px-4 py-3 text-sm font-bold">Tamam</button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
              Sorunu kısaca anlat (ne yaptın, ne bekledin, ne oldu). Sürüm ve cihaz bilgisi otomatik eklenir.
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Örn: Zamana Karşı'da süre bitince skor kaydedilmedi..."
              className="mt-3 w-full resize-y rounded-xl border p-3 text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />

            {status === 'error' ? (
              <p className="mt-2 text-xs" style={{ color: 'var(--danger-text)' }}>
                Gönderilemedi (bağlantı ya da sunucu sorunu).{' '}
                <a href={reportMailtoUrl(context, message, detail)} style={{ color: 'var(--gold)' }}>E-posta ile gönder</a>
              </p>
            ) : null}

            <button
              onClick={() => void send()}
              disabled={status === 'sending' || message.trim().length === 0}
              className="btn-gold mt-3 w-full rounded-2xl px-4 py-3 text-sm font-bold disabled:opacity-50"
            >
              {status === 'sending' ? 'Gönderiliyor...' : 'Gönder'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
