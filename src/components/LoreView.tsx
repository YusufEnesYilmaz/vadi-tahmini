import { useEffect, useState } from 'react'
import type { DiffRules } from '../game/difficulty'
import { censorName, loadLore, loreFromCache, splitSentences } from '../game/lore'
import type { Champion } from '../game/types'

interface Props {
  champion: Champion
  wrongCount: number
  revealed: boolean
  rules: DiffRules
}

/**
 * Lore modu: şampiyonun hikâyesinden kim olduğunu bul.
 * Adı metinden silinir; cümleler yanlış tahminlerde tek tek açılır.
 */
export default function LoreView({ champion, wrongCount, revealed, rules }: Props) {
  const [lore, setLore] = useState<string | undefined>(() => loreFromCache(champion.id))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    setFailed(false)
    const cached = loreFromCache(champion.id)
    if (cached) { setLore(cached); return }
    setLore(undefined)
    loadLore().then(
      (map) => { if (alive) setLore(map[champion.id]?.lore ?? '') },
      () => { if (alive) setFailed(true) },
    )
    return () => { alive = false }
  }, [champion.id])

  if (failed) {
    return (
      <p className="max-w-lg text-center text-sm" style={{ color: 'var(--danger-text)' }}>
        Hikâye yüklenemedi. Bağlantını kontrol edip sayfayı yenile.
      </p>
    )
  }

  if (lore === undefined) {
    return (
      <p className="max-w-lg text-center text-sm" style={{ color: 'var(--text-dim)' }}>
        Hikâye yükleniyor...
      </p>
    )
  }

  const sentences = splitSentences(censorName(lore, champion))
  const shown = revealed ? sentences.length : Math.min(sentences.length, rules.loreStart + wrongCount)
  const allOpen = shown >= sentences.length

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-2">
      <div className="w-full rounded-xl border p-4 text-sm leading-relaxed"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text)' }}>
        {sentences.slice(0, shown).map((s, i) => (
          <span key={i} className={i === shown - 1 && !revealed ? 'anim-row' : ''}> {s}</span>
        ))}
        {/* Kalan cümleler kapalı kutu olarak durur: daha ne kadar var, görünsün */}
        {!allOpen && (
          <span style={{ color: 'var(--text-dim)' }}> {'▒'.repeat(24)}</span>
        )}
      </div>
      <div className="min-h-5 text-xs" style={{ color: 'var(--text-dim)' }}>
        {allOpen
          ? <span>Hikâyenin tamamı açık</span>
          : <span>Her yanlışta bir cümle daha açılır ({shown}/{sentences.length})</span>}
      </div>
    </div>
  )
}
