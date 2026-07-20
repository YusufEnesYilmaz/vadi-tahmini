import type { Puzzle } from '../game/puzzle'
import { passiveUrl, spellUrl, splashUrl } from '../game/data'

interface Props {
  puzzle: Puzzle
  wrongCount: number
  revealed: boolean // oyun bitti mi (tam görsel + cevap gösterilir)
  hideSlot?: boolean // yetenek bonusu beklerken tuş bilgisini gizle
}

/** Yetenek / Görsel / Kostüm modlarının soru alanı (Classic'in tablosu ayrı) */
export default function PuzzleView({ puzzle, wrongCount, revealed, hideSlot }: Props) {
  if (puzzle.sub === 'ability') {
    const idx = puzzle.spellIndex ?? 0
    const isPassive = idx === 0
    const spell = isPassive ? null : puzzle.champion.spells[idx - 1]
    const img = isPassive ? passiveUrl(puzzle.champion.passive.img) : spellUrl(spell!.img)
    const name = isPassive ? puzzle.champion.passive.name : spell!.name
    const slot = isPassive ? 'Pasif' : spell!.slot
    return (
      <div className="flex flex-col items-center gap-3">
        <img
          src={img}
          alt="Yetenek"
          className="h-16 w-16 rounded-xl border-2"
          style={{ borderColor: 'var(--gold)', imageRendering: 'pixelated' }}
        />
        <div className="flex min-h-6 flex-col items-center gap-1 text-sm" style={{ color: 'var(--text-dim)' }}>
          {(revealed || wrongCount >= 3) && <span>Yetenek adı: <b style={{ color: 'var(--gold)' }}>{name}</b></span>}
          {/* Tuş artık ipucu değil bonus soru — bonus cevaplanmadan gösterilmez */}
          {revealed && !hideSlot && <span>Tuş: <b style={{ color: 'var(--gold)' }}>{slot}</b></span>}
          {!revealed && wrongCount < 3 && <span>İpucu: 3 yanlışta yetenek adı</span>}
        </div>
      </div>
    )
  }

  if (puzzle.sub === 'splash') {
    // Her yanlışta uzaklaş: 500% → 150%; bitince tam görsel
    const zoom = Math.max(150, 500 - wrongCount * 70)
    const crop = puzzle.crop ?? { x: 50, y: 50 }
    return (
      <div
        className="aspect-video w-full max-w-[260px] overflow-hidden rounded-xl border"
        style={{
          borderColor: 'var(--border)',
          backgroundImage: `url(${splashUrl(puzzle.champion.id, 0)})`,
          backgroundSize: revealed ? 'cover' : `${zoom}%`,
          backgroundPosition: revealed ? 'center' : `${crop.x}% ${crop.y}%`,
          transition: 'background-size 0.5s ease',
        }}
        role="img"
        aria-label="Splash art parçası"
      />
    )
  }

  // Kostüm modu: kırpık gösterilir (tamamı görünürse çok kolay) — her yanlışta açılır
  const zoom = Math.max(150, 700 - wrongCount * 90)
  const crop = puzzle.crop ?? { x: 50, y: 50 }
  return (
    <div className="flex w-full max-w-[260px] flex-col items-center gap-2">
      <div
        className="aspect-video w-full overflow-hidden rounded-xl border"
        style={{
          borderColor: 'var(--border)',
          backgroundImage: `url(${splashUrl(puzzle.champion.id, puzzle.skin?.num ?? 0)})`,
          backgroundSize: revealed ? 'cover' : `${zoom}%`,
          backgroundPosition: revealed ? 'center' : `${crop.x}% ${crop.y}%`,
          transition: 'background-size 0.5s ease',
        }}
        role="img"
        aria-label="Kostüm görseli parçası"
      />
      <div className="min-h-5 text-sm" style={{ color: 'var(--text-dim)' }}>
        {(revealed || wrongCount >= 3) ? (
          <span>Şampiyon: <b style={{ color: 'var(--gold)' }}>{puzzle.champion.name}</b></span>
        ) : (
          <span>İpucu: 3 yanlışta şampiyon adı</span>
        )}
      </div>
    </div>
  )
}
