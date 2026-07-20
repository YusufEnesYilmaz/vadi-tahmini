import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
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
  }

  render() {
    const { error } = this.state
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
            className="card-btn rounded-xl px-5 py-2.5 font-bold"
            style={{ background: 'var(--gold)', color: 'var(--on-gold)' }}>
            Tekrar dene
          </button>
          <button onClick={() => location.reload()}
            className="card-btn rounded-xl border px-5 py-2.5 font-bold"
            style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
            Sayfayı yenile
          </button>
        </div>

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
