import { useEffect, useRef, useState } from 'react'
import { voiceUrl } from '../game/data'
import type { DiffRules } from '../game/difficulty'
import type { Champion } from '../game/types'

interface Props {
  champion: Champion
  wrongCount: number
  revealed: boolean
  rules: DiffRules
}

const VOLUME_KEY = 'vt:volume'

function loadVolume(): number {
  const v = Number(localStorage.getItem(VOLUME_KEY))
  return Number.isFinite(v) && v > 0 ? Math.min(v, 1) : 0.8
}

type Clip = 'ban' | 'choose'

/**
 * Replik modu: şampiyonun Türkçe seslendirmesinden bul.
 * İki klip var — yasaklanma repliği (daha kapalı) ve seçilme repliği (daha tanıdık).
 */
export default function QuoteView({ champion, wrongCount, revealed, rules }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [active, setActive] = useState<Clip | null>(null) // yüklü olan klip
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(loadVolume)
  const [failed, setFailed] = useState(false)
  const [time, setTime] = useState({ at: 0, total: 0 }) // çalan klibin ilerlemesi

  const secondOpen = revealed || (rules.quoteSecondAt !== null && wrongCount >= rules.quoteSecondAt)

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

    el.src = voiceUrl(champion.key, kind)
    el.volume = volume
    setActive(kind)
    setTime({ at: 0, total: 0 })
    el.play().then(() => setPlaying(true), () => { setPlaying(false); setFailed(true) })
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
    localStorage.setItem(VOLUME_KEY, String(volume))
  }, [volume])

  // Yeni bulmacada ilk klibi kendiliğinden çal (moda tıklayarak girildiği için
  // tarayıcı genelde izin verir; vermezse buton zaten duruyor)
  useEffect(() => {
    const el = audioRef.current
    toggle('ban')
    return () => el?.pause() // bulmaca değişince önceki klip susmalı
    // oxlint-disable-next-line react-hooks/exhaustive-deps
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
      <audio
        ref={audioRef}
        preload="none"
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => setTime({ at: 0, total: e.currentTarget.duration })}
      />

      <div className="flex w-full flex-col gap-2">
        <ClipButton kind="ban" idle="Repliği dinle" />

        {secondOpen ? (
          <ClipButton kind="choose" idle="İkinci replik" />
        ) : (
          <div className="rounded-xl border px-4 py-3 text-center text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            {rules.quoteSecondAt === null
              ? '🔒 Bu zorlukta ikinci replik açılmaz'
              : `🔒 İkinci replik ${rules.quoteSecondAt} yanlışta açılır`}
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
