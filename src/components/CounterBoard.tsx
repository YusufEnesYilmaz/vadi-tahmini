import { useMemo } from 'react'
import { PENALTY_SECONDS, WRONG_STREAK_PENALTY, type CountChallenge } from '../game/counter'
import { CHAMPIONS, byId, squareUrl } from '../game/data'
import Autocomplete, { type AcOption } from './Autocomplete'

interface Props {
  challenge: CountChallenge
  found: string[]
  wrong: string[]
  wrongStreak: number
  finished: boolean
  /** Yanlış seçimde titreme — dışarıdan sürülür (ceza/ses mantığı çağırana ait) */
  shake: boolean
  onShakeEnd: () => void
  onPick: (id: string) => void
}

/**
 * "Kaç Tane?" turunun ORTAK arayüzü — tek kişilik (`CounterGame`) ve
 * multiplayer (`CounterMulti`) aynı bileşeni kullanır ki iki ekran zamanla
 * ayrışmasın; kural/görünüm değişikliği ikisine birden gitsin.
 *
 * Öneri listesi **TÜM şampiyonları** gösterir, ölçüte uyanları değil — süzülseydi
 * listenin kendisi cevap anahtarı olurdu.
 */
export default function CounterBoard({ challenge, found, wrong, wrongStreak, finished, shake, onShakeEnd, onPick }: Props) {
  const options: AcOption[] = useMemo(
    () => CHAMPIONS.map((c) => ({ key: c.id, label: c.name, img: squareUrl(c.id) })),
    [],
  )
  // Denenmişler listeden düşer (ekranda zaten yeşil/kırmızı duruyorlar)
  const triedSet = useMemo(() => new Set([...found, ...wrong]), [found, wrong])
  const total = challenge.ids.length

  return (
    <>
      {/* Ölçüt afişi — turun yıldızı: altın gradyan zemin + masaüstünde büyük tipografi */}
      <div className="w-full rounded-2xl border p-4 lg:p-5 text-center"
        style={{
          borderColor: 'var(--gold)',
          background: 'linear-gradient(135deg, rgba(var(--gold-glow-rgb), 0.1), var(--bg-card) 55%)',
          boxShadow: '0 0 24px rgba(var(--gold-glow-rgb), 0.12)',
        }}>
        <div className="section-label">Ölçüt</div>
        <div className="font-display text-2xl lg:text-3xl font-bold" style={{ color: 'var(--gold-bright)' }}>{challenge.label}</div>
        <div className="mt-0.5 text-xs" style={{ color: 'var(--text-dim)' }}>{total} şampiyon var</div>
      </div>

      {/* Giriş */}
      {!finished && (
        <div className={`w-full ${shake ? 'anim-shake' : ''}`} onAnimationEnd={onShakeEnd}>
          <Autocomplete
            options={options}
            disabledKeys={triedSet}
            onPick={onPick}
            autoFocus
            placeholder="Şampiyon adı yaz..."
          />
          {wrongStreak > 0 && (
            <p className="mt-1.5 text-xs" style={{ color: 'var(--danger-text)' }}>
              Üst üste <b>{wrongStreak}/{WRONG_STREAK_PENALTY}</b> yanlış — {WRONG_STREAK_PENALTY}'te süreden {PENALTY_SECONDS} sn gider.
            </p>
          )}
        </div>
      )}

      {/* İlerleme çubuğu */}
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-input)' }}>
        <div className="h-full rounded-full transition-all duration-300"
          style={{ width: `${(found.length / Math.max(1, total)) * 100}%`, background: 'var(--gold)' }} />
      </div>

      {/* Bulunanlar */}
      {found.length > 0 && (
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {found.map((id) => (
            <div key={id} className="anim-pop flex items-center gap-2 rounded-lg border p-2"
              style={{ borderColor: 'var(--correct)', background: 'rgba(var(--correct-rgb), 0.1)' }}>
              <img src={squareUrl(id)} alt="" className="h-8 w-8 rounded-md" />
              <span className="truncate text-sm font-semibold" style={{ color: 'var(--correct)' }}>{byId(id)?.name ?? id}</span>
            </div>
          ))}
        </div>
      )}

      {/* Uymayanlar — cezasız deneme kaydı */}
      {wrong.length > 0 && (
        <div className="w-full">
          <div className="section-label mb-1.5" style={{ color: 'var(--danger-text)' }}>
            Uymayanlar ({wrong.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {wrong.map((id) => (
              <span key={id} className="anim-pop flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                style={{ borderColor: 'var(--danger)', background: 'rgba(var(--danger-text-rgb), 0.08)', color: 'var(--danger-text)' }}>
                <img src={squareUrl(id)} alt="" className="h-5 w-5 rounded" style={{ filter: 'grayscale(0.6)' }} />
                {byId(id)?.name ?? id}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
