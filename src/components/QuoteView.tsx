import { useEffect, useRef, useState } from 'react'
import { voiceUrl } from '../game/data'
// Ses seviyesi tek kaynaktan (`sfx.ts`). Buradaki kopya okuma/yazma SİLİNDİ:
// iki dosya aynı anahtarı farklı kurallarla yorumluyordu ("0" burada geçersiz
// sayılıp 0.8'e geri yazılıyordu) → Ayarlar'dan sessize alan oyuncunun tercihi
// Replik moduna girince sessizce bozuluyordu.
import { getVolume, setVolume as saveVolume } from '../game/sfx'
import type { DiffRules } from '../game/difficulty'
import type { Champion } from '../game/types'

interface Props {
  champion: Champion
  wrongCount: number
  revealed: boolean
  rules: DiffRules
}

type Clip = 'ban' | 'choose' | 'sfx'

/**
 * Replik modu: şampiyonun Türkçe seslendirmesinden bul.
 * Üç klip var — yasaklanma repliği (daha kapalı), seçilme repliği (daha tanıdık) ve seçilme sfx/efekti.
 */
export default function QuoteView({ champion, wrongCount, revealed, rules }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [active, setActive] = useState<Clip | null>(null) // yüklü olan klip
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(getVolume)
  const [failed, setFailed] = useState(false)
  const [time, setTime] = useState({ at: 0, total: 0 }) // çalan klibin ilerlemesi

  const secondOpen = revealed || (rules.quoteSecondAt !== null && wrongCount >= rules.quoteSecondAt)
  const thirdOpen = revealed || (rules.quoteThirdAt !== null && wrongCount >= rules.quoteThirdAt)

  /** Aynı klibe basmak duraklatır/devam ettirir, farklı klip baştan çalar */
  function toggle(kind: Clip) {
    const el = audioRef.current
    if (!el) return
    setFailed(false)

    if (active === kind) {
      if (playing) { el.pause(); setPlaying(false); return }
      el.play().then(() => setPlaying(true), () => setFailed(true))
      return
    }

    // src değiştiğinde önce load() çağır, sonra canplaythrough'da çal.
    // Bazı tarayıcılarda src set edip hemen play() çağırmak "NotAllowedError"
    // veya "AbortError" veriyor — özellikle mobil ve opak önbellek durumlarında.
    el.pause()
    el.src = voiceUrl(champion.key, kind)
    el.volume = volume
    el.load()
    setActive(kind)
    setTime({ at: 0, total: 0 })

    const onReady = () => {
      el.removeEventListener('canplaythrough', onReady)
      el.removeEventListener('error', onErr)
      el.play().then(() => setPlaying(true), () => { setPlaying(false); setFailed(true) })
    }
    const onErr = () => {
      el.removeEventListener('canplaythrough', onReady)
      el.removeEventListener('error', onErr)
      setPlaying(false)
      setFailed(true)
    }
    el.addEventListener('canplaythrough', onReady, { once: true })
    el.addEventListener('error', onErr, { once: true })
  }

  // İlerleme çubuğu: `timeupdate` saniyede ~4 kez gelip kasıntılı görünüyordu,
  // onun yerine çalarken ekran yenileme hızında oku (akıcı kayma)
  useEffect(() => {
    if (!playing) return
    let id = 0
    const tick = () => {
      const el = audioRef.current
      if (el) setTime({ at: el.currentTime, total: el.duration })
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [playing])

  // Ses seviyesi anında uygulansın ve bir dahaki sefere hatırlansın
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
    saveVolume(volume)
  }, [volume])

  // Yeni bulmacada ilk klibi kendiliğinden çal.
  // toggle() closure sorununa yol açıyordu, doğrudan element üzerinden yapıyoruz.
  // Autoplay engellenirse sessizce bırak — buton zaten ekranda.
  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    el.pause()
    el.src = voiceUrl(champion.key, 'ban')
    el.volume = volume
    el.load()
    setActive('ban')
    setTime({ at: 0, total: 0 })
    setPlaying(false)
    setFailed(false)

    const tryPlay = () => {
      el.removeEventListener('canplaythrough', tryPlay)
      el.play().then(() => setPlaying(true), () => { /* autoplay engellendi — buton yeterli */ })
    }
    el.addEventListener('canplaythrough', tryPlay, { once: true })

    return () => {
      el.removeEventListener('canplaythrough', tryPlay)
      el.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [champion.id])

  function label(kind: Clip, idle: string) {
    if (active !== kind) return `▶ ${idle}`
    return playing ? '⏸ Duraklat' : '▶ Devam et'
  }

  function mmss(s: number) {
    if (!Number.isFinite(s)) return '0:00'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  /** Klip butonu — zemininde akıcı ilerleme dolgusu, sağında süre */
  function ClipButton({ kind, idle }: { kind: Clip; idle: string }) {
    const isActive = active === kind && time.total > 0
    const pct = isActive ? Math.min(100, (time.at / time.total) * 100) : 0
    return (
      <button onClick={() => toggle(kind)}
        className="card-btn relative overflow-hidden rounded-xl border px-4 py-3 font-semibold"
        style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
        <span className="absolute inset-y-0 left-0" aria-hidden
          style={{ width: `${pct}%`, background: 'var(--gold-soft)' }} />
        <span className="relative flex items-center justify-between gap-2">
          <span>{label(kind, idle)}</span>
          {isActive && (
            <span className="text-xs tabular-nums opacity-70">{mmss(time.at)} / {mmss(time.total)}</span>
          )}
        </span>
      </button>
    )
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3">
      {/*
        crossOrigin ŞART (2026-07-21'de yaşanan hata):
        Bu olmadan tarayıcı sesi "no-cors" ile istiyor ve gelen cevap OPAK oluyor —
        içeriği okunamıyor. Servis çalışanı opak cevabı önbelleğe alınca, medya
        oynatıcının parçalı (Range) isteğini dilimleyemiyor ve ses HİÇ çalmıyor.
        Belirti: güncellemeden sonra ses gitti, başka tarayıcıda (önbelleksiz) çalıştı.
        CDragon `Access-Control-Allow-Origin: *` gönderiyor, yani CORS güvenli.
      */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="none"
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => setTime({ at: 0, total: e.currentTarget.duration })}
      />

      <div className="flex w-full flex-col gap-2">
        <ClipButton kind="ban" idle="Replik 1" />

        {secondOpen ? (
          <ClipButton kind="choose" idle="Replik 2" />
        ) : (
          <div className="rounded-xl border px-4 py-3 text-center text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            {rules.quoteSecondAt === null
              ? '🔒 Bu zorlukta Replik 2 açılmaz'
              : `🔒 Replik 2, ${rules.quoteSecondAt} yanlışta açılır`}
          </div>
        )}

        {thirdOpen ? (
          <ClipButton kind="sfx" idle="Replik 3" />
        ) : (
          <div className="rounded-xl border px-4 py-3 text-center text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            {rules.quoteThirdAt === null
              ? '🔒 Bu zorlukta Replik 3 açılmaz'
              : `🔒 Replik 3, ${rules.quoteThirdAt} yanlışta açılır`}
          </div>
        )}
      </div>

      {/* Ses seviyesi — tarayıcı sekmesini kısmak yerine oyun içinden ayarlansın */}
      <div className="flex w-full items-center gap-3">
        <button onClick={() => setVolume((v) => (v > 0 ? 0 : 0.8))}
          aria-label={volume > 0 ? 'Sesi kapat' : 'Sesi aç'}
          className="card-btn rounded-xl border px-2.5 py-1.5"
          style={{ borderColor: 'var(--border)' }}>
          {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
        </button>
        <input
          type="range" min={0} max={100} value={Math.round(volume * 100)}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          aria-label="Ses seviyesi"
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
          style={{ accentColor: 'var(--gold)', background: 'var(--bg-input)' }}
        />
        <span className="w-9 shrink-0 text-right text-xs tabular-nums" style={{ color: 'var(--text-dim)' }}>
          {Math.round(volume * 100)}
        </span>
      </div>

      <p className="min-h-5 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
        {failed
          ? 'Ses çalınamadı — butona basıp tekrar dene.'
          : 'Repliği dinle ve kimin konuştuğunu bul.'}
      </p>
    </div>
  )
}

