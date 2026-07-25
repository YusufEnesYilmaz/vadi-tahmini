import { useEffect, useState } from 'react'

interface Props {
  src?: string
}

export default function GameBackdrop({ src }: Props) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  if (!src || failed) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <img
        src={src}
        alt=""
        className="game-scene-bg"
        decoding="async"
        onError={() => setFailed(true)}
      />
      <div className="game-scene-overlay" />
      <div className="game-scene-vignette" />
    </div>
  )
}
