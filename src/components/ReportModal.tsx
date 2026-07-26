import { useEffect, useState } from 'react'
import { useModalFocusTrap } from './useModalFocusTrap'
import { REPORT_KINDS, buildDiagnostic, reportContext, reportMailtoUrl, type ReportKind } from '../game/report'
import { submitReport, isLeaderboardEnabled } from '../game/supabase'

interface Props {
  /** Hangi ekrandan açıldı ("Ayarlar", "Çöküş"…) — rapora eklenir */
  context: string
  /** Açılış türü; kullanıcı modal içindeki segmentten değiştirebilir */
  kind?: ReportKind
  /** Varsa hata mesajı + stack (çöküş ekranı) — tanı metnine gömülür */
  detail?: string
  onClose: () => void
}

type Status = 'idle' | 'sending' | 'sent' | 'error'

const KIND_ORDER: ReportKind[] = ['bug', 'idea']

/**
 * Geri bildirim formu: "Hata bildir" ve "Öneri gönder" AYNI modalı kullanır,
 * üstteki segmentten geçilir. Rapor SİTE ÜZERİNDEN Supabase'e (`vt_reports`)
 * yazılır; Supabase yoksa (yerel/backend kapalı) mailto yedeğine düşer.
 *
 * Tür ayrı kolona DEĞİL, `context` önekine yazılır (`"Öneri · Ayarlar"`) —
 * gerekçe `report.ts`'te: şema değişikliği elle SQL çalıştırmayı gerektirirdi.
 */
export default function ReportModal({ context, kind = 'bug', detail, onClose }: Props) {
  const dialogRef = useModalFocusTrap<HTMLDivElement>()
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [activeKind, setActiveKind] = useState<ReportKind>(kind)

  const meta = REPORT_KINDS[activeKind]
  const fullContext = reportContext(activeKind, context)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function send() {
    if (status === 'sending') return
    // Supabase yoksa doğrudan mailto yedeğine düş
    if (!isLeaderboardEnabled) {
      window.location.href = reportMailtoUrl(fullContext, message, detail)
      return
    }
    setStatus('sending')
    const ok = await submitReport(fullContext, message.trim(), buildDiagnostic(fullContext, detail))
    setStatus(ok ? 'sent' : 'error')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 sm:items-center ovl"
      style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div ref={dialogRef} className="anim-pop my-auto w-full max-w-md rounded-2xl border p-4 panel"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={meta.title}>

        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold-bright)' }}>
            {meta.icon} {meta.title}
          </h2>
          <button onClick={onClose} className="card-btn rounded-lg border px-2.5 py-1 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            Kapat
          </button>
        </div>

        {status === 'sent' ? (
          <div className="mt-4 text-center">
            <div className="text-4xl">✅</div>
            <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--accent-done)' }}>{meta.sentTitle}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>{meta.sentNote}</p>
            <button onClick={onClose} className="btn-gold mt-4 w-full rounded-2xl px-4 py-3 text-sm font-bold">Tamam</button>
          </div>
        ) : (
          <>
            {/*
              Tür seçici — birleşik segment (menü kalıbı). `overflow-hidden` KULLANILMAZ:
              odak halkasını kırpar (2026-07-25 dersi); köşeler iç butonlarda yuvarlanır.
            */}
            <div className="menu-mini-actions mt-3 flex rounded-lg border" style={{ borderColor: 'var(--border)' }}
              role="group" aria-label="Geri bildirim türü">
              {KIND_ORDER.map((k, i) => {
                const active = k === activeKind
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => { if (!active) { setActiveKind(k); setStatus('idle') } }}
                    aria-pressed={active}
                    className={`menu-seg flex-1 px-3 py-2 text-sm font-semibold ${i === 0 ? 'rounded-l-lg' : 'rounded-r-lg border-l'}`}
                    style={{
                      borderColor: 'var(--border)',
                      background: active ? 'rgba(var(--gold-rgb), 0.14)' : 'transparent',
                      color: active ? 'var(--gold-bright)' : 'var(--text-dim)',
                    }}
                  >
                    {REPORT_KINDS[k].icon} {REPORT_KINDS[k].label}
                  </button>
                )
              })}
            </div>

            <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
              {meta.hint}
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder={meta.placeholder}
              className="mt-3 w-full resize-y rounded-xl border p-3 text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />

            {status === 'error' ? (
              <p className="mt-2 text-xs" style={{ color: 'var(--danger-text)' }}>
                Gönderilemedi (bağlantı ya da sunucu sorunu).{' '}
                <a href={reportMailtoUrl(fullContext, message, detail)} style={{ color: 'var(--gold)' }}>E-posta ile gönder</a>
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
