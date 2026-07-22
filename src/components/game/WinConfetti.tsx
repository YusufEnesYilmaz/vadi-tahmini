import { useMemo } from 'react'

const CONFETTI_COLORS = ['var(--gold)', 'var(--gold-bright)', 'var(--partial)', 'var(--blue)']

/**
 * Kazanınca ekrana bir kez altın konfeti yağar. CSS-only (bağımlılık yok),
 * `prefers-reduced-motion`'da gizlenir. Kazanma bloğu unmount olunca kaybolur;
 * her galibiyette yeniden mount olduğu için rastgelelik tazelenir.
 */
export default function WinConfetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 22 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.3,
        dur: 0.9 + Math.random() * 0.8,
        rot: (Math.random() * 720 - 360) | 0,
        color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
        w: 6 + Math.random() * 5,
        h: 9 + Math.random() * 6,
      })),
    [],
  )

  return (
    <div className="pointer-events-none fixed inset-0 z-[55] overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.h,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            ['--rot' as string]: `${p.rot}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
