import { useEffect, type ReactNode } from 'react'
import { useModalFocusTrap } from './useModalFocusTrap'

interface Props {
  title: string
  /** Duruma özel açıklama — çağıran ekran yazar (skor kaybı, süre akıyor vb.) */
  children: ReactNode
  stayLabel?: string
  leaveLabel?: string
  onStay: () => void
  onLeave: () => void
}

/**
 * Çıkış onayı — "Kaç Tane?" tek kişilik ve multiplayer ekranlarının PAYLAŞTIĞI modal.
 * Yerleşik `confirm()` kullanılmaz (kullanıcı onu beğenmedi, tema dışı duruyor).
 * Escape ve dışına tıklama = vazgeç; varsayılan (altın) buton KALMAK, çünkü
 * yanlışlıkla basılan tuş oyuncuyu turundan etmemeli.
 */
export default function ExitConfirm({ title, children, stayLabel = 'Devam et', leaveLabel = 'Çık', onStay, onLeave }: Props) {
  const dialogRef = useModalFocusTrap<HTMLDivElement>()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onStay()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onStay])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ovl"
      style={{ background: 'var(--overlay)' }} onClick={onStay}>
      <div ref={dialogRef} className="anim-pop w-full max-w-xs rounded-2xl border p-5 text-center panel"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--gold)' }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="text-3xl">🚪</div>
        <h3 className="mt-1 font-display text-lg font-bold">{title}</h3>
        <p className="mt-1.5 text-sm" style={{ color: 'var(--text-dim)' }}>{children}</p>
        <div className="mt-4 flex gap-2">
          <button onClick={onStay} className="btn-gold flex-1 rounded-xl px-3 py-2.5 text-sm font-bold">
            {stayLabel}
          </button>
          <button onClick={onLeave} className="card-btn flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger-text)' }}>
            {leaveLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
