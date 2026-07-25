import { Component, type ErrorInfo, type ReactNode } from 'react'
import { buildDiagnostic, reportMailtoUrl } from '../game/report'
import { submitReport, isLeaderboardEnabled } from '../game/supabase'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
  stack?: string
  reportStatus?: 'idle' | 'sending' | 'sent' | 'error'
}

/**
 * Bir bileşen patlarsa React tüm ağacı söküyor ve ekran bomboş kalıyor —
 * kullanıcı ne olduğunu anlamıyor (Replik modunda bir kez yaşandı).
 * Burası o durumu yakalayıp toparlanma yolu sunar.
 *
 * Hook'larla yazılamaz: React yalnızca sınıf bileşenlerinde hata yakalamayı destekliyor.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Konsola bas: kullanıcı hata mesajını bize iletebilsin
    console.error('Beklenmeyen hata:', error, info.componentStack)
    // Stack'i sakla: rapora eklensin
    this.setState({ stack: info.componentStack ?? undefined })
  }

  // Çökünce kullanıcı yazamaz — değer stack'te. Tek tıkla OTOMATİK gönder
  // (site üzerinden Supabase'e); Supabase yoksa/başarısızsa mailto yedeği.
  reportCrash = () => {
    const { error, stack } = this.state
    const detail = `${error?.message ?? ''}\n\n${stack ?? ''}`
    if (!isLeaderboardEnabled) {
      window.location.href = reportMailtoUrl('Çöküş', '(otomatik çöküş raporu)', detail)
      return
    }
    this.setState({ reportStatus: 'sending' })
    void submitReport('Çöküş', '(otomatik çöküş raporu)', buildDiagnostic('Çöküş', detail))
      .then((ok) => this.setState({ reportStatus: ok ? 'sent' : 'error' }))
  }

  render() {
    const { error, stack, reportStatus } = this.state
    if (!error) return this.props.children

    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-5xl">🛠</div>
        <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--gold-bright)' }}>
          Bir şeyler ters gitti
        </h1>
        <p className="text-sm" style={{ color: 'var(--text)' }}>
          Oyun beklenmedik bir hataya düştü. İlerlemen kaybolmadı — kayıtlar cihazında duruyor.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => this.setState({ error: null })}
            className="btn-gold rounded-xl px-5 py-2.5 font-bold">
            Tekrar dene
          </button>
          <button onClick={() => location.reload()}
            className="card-btn rounded-xl border px-5 py-2.5 font-bold"
            style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
            Sayfayı yenile
          </button>
          <button onClick={this.reportCrash}
            disabled={reportStatus === 'sending' || reportStatus === 'sent'}
            className="card-btn rounded-xl border px-5 py-2.5 font-bold disabled:opacity-60"
            style={{ borderColor: 'var(--border)', color: reportStatus === 'sent' ? 'var(--accent-done)' : 'var(--text-dim)' }}>
            {reportStatus === 'sending' ? 'Gönderiliyor...' : reportStatus === 'sent' ? '✓ Gönderildi' : '🐛 Bu hatayı bildir'}
          </button>
        </div>

        {reportStatus === 'error' ? (
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            Gönderilemedi.{' '}
            <a href={reportMailtoUrl('Çöküş', '(otomatik çöküş raporu)', `${error.message}\n\n${stack ?? ''}`)} style={{ color: 'var(--gold)' }}>
              E-posta ile bildir
            </a>
          </p>
        ) : null}

        {/* Hata metni: kullanıcı ekran görüntüsüyle iletebilsin diye açık */}
        <details className="w-full text-left">
          <summary className="cursor-pointer text-xs" style={{ color: 'var(--text-dim)' }}>
            Teknik ayrıntı
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-xl border p-3 text-xs"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-dim)' }}>
            {error.message}
          </pre>
        </details>
      </div>
    )
  }
}
