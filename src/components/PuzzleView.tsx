import type { Puzzle } from '../game/puzzle'
import { EMOJI, itemById, itemIconUrl, loadingUrl, passiveUrl, spellUrl, splashUrl } from '../game/data'
import type { DiffRules } from '../game/difficulty'
import LoreView from './LoreView'
import QuoteView from './QuoteView'

interface Props {
  puzzle: Puzzle
  wrongCount: number
  revealed: boolean // oyun bitti mi (tam görsel + cevap gösterilir)
  rules: DiffRules // ipucu takvimi zorluktan gelir
  hideSlot?: boolean // yetenek bonusu beklerken tuş bilgisini gizle
}

/** kaçıncı yanlışta açılacağı `at`; null ise hiç açılmaz */
function unlocked(at: number | null, wrongCount: number, revealed: boolean): boolean {
  if (revealed) return true
  return at !== null && wrongCount >= at
}

/** Yetenek / Görsel / Kostüm / Emoji / Replik / Eşya modlarının soru alanı (Classic'in tablosu ayrı) */
export default function PuzzleView({ puzzle, wrongCount, revealed, rules, hideSlot }: Props) {
  // Eşya modu: ikon soru, ipuçları sırayla altın → statlar → bileşen ikonları.
  // İlk dal olmalı — aşağıdaki dallar şampiyon varsayıyor (TS de bunu böyle daraltıyor).
  if (puzzle.sub === 'item') {
    /*
     * Mod TERS (2026-07-21, kullanıcı isteği): ikon soru değil, en güçlü ipucu.
     * Baştan yalnız altın değeri var; statlar, bileşenler ve en sonda ikon açılır.
     * Eskiden ikon baştan görünüyordu ve bilen için bilmece bitmiş oluyordu.
     */
    const { item } = puzzle
    const showTags = unlocked(rules.itemTagsAt, wrongCount, revealed) && item.tags.length > 0
    const showParts = unlocked(rules.itemPartsAt, wrongCount, revealed) && item.from.length > 0
    const showIcon = unlocked(rules.itemIconAt, wrongCount, revealed)
    // İkon açıldıktan SONRAKİ her yanlışta biraz daha netleşir
    const sinceIcon = Math.max(0, wrongCount - (rules.itemIconAt ?? 0))
    const iconBlur = Math.max(0, 7 - sinceIcon * 2)
    const iconOpacity = Math.min(1, 0.4 + sinceIcon * 0.15)
    return (
      <div className="flex flex-col items-center gap-3">
        {showIcon ? (
          /*
           * İkon açılınca birden net gelmiyor: silik ve bulanık başlıyor, sonraki
           * yanlışlarda netleşiyor. Böylece ikon "cevabı veren" değil, "yaklaştıran"
           * bir ipucu oluyor. Tur bitince (revealed) tam net gösterilir.
           */
          <img
            src={itemIconUrl(item.img)}
            alt="Eşya ikonu"
            className="anim-pop h-24 w-24 rounded-xl border-2"
            style={{
              borderColor: 'var(--gold)',
              filter: revealed ? 'none' : `blur(${iconBlur}px) grayscale(${iconBlur / 10})`,
              opacity: revealed ? 1 : iconOpacity,
              transition: 'filter 0.4s ease, opacity 0.4s ease',
            }}
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2 text-4xl"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-dim)' }}
            aria-label="Eşya ikonu henüz kapalı">
            🗡
          </div>
        )}

        {/* Altın: sorunun kendisi, hep açık */}
        <div className="font-display text-2xl font-extrabold" style={{ color: 'var(--gold-bright)' }}>
          {item.gold} altın
        </div>

        <div className="flex min-h-6 flex-col items-center gap-1 text-sm" style={{ color: 'var(--text-dim)' }}>
          {showTags && (
            <span className="flex flex-wrap justify-center gap-1">
              {item.tags.map((t) => (
                <b key={t} className="rounded-md px-2 py-0.5 text-xs"
                  style={{ background: 'var(--bg-input)', color: 'var(--gold)' }}>{t}</b>
              ))}
            </span>
          )}
          {showParts && (
            <span className="flex items-center gap-1">
              Bileşenler:
              {item.from.map((id, i) => {
                const part = itemById(id)
                return part
                  ? <img key={`${id}-${i}`} src={itemIconUrl(part.img)} alt={part.name} title={part.name}
                      className="h-7 w-7 rounded border" style={{ borderColor: 'var(--border)' }} />
                  : null
              })}
            </span>
          )}
          {/* Sıradaki ipucunun ne zaman geleceğini söyle — boş ekranda bekletme */}
          {!revealed && !showTags && (
            <span>
              {rules.itemTagsAt === null
                ? 'Bu zorlukta stat ipucu yok'
                : `${rules.itemTagsAt}. yanlışta statlar açılır`}
            </span>
          )}
          {!revealed && showTags && !showParts && item.from.length > 0 && (
            <span>
              {rules.itemPartsAt === null
                ? 'Bu zorlukta bileşen ipucu yok'
                : `${rules.itemPartsAt}. yanlışta bileşenler açılır`}
            </span>
          )}
          {!revealed && !showIcon && (
            <span className="text-xs">
              {rules.itemIconAt === null ? 'İkon bu zorlukta hiç açılmaz' : `${rules.itemIconAt}. yanlışta ikon açılır`}
            </span>
          )}
        </div>
      </div>
    )
  }

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
          {unlocked(rules.abilityNameAt, wrongCount, revealed) && (
            <span>Yetenek adı: <b style={{ color: 'var(--gold)' }}>{name}</b></span>
          )}
          {/* Tuş artık ipucu değil bonus soru — bonus cevaplanmadan gösterilmez */}
          {revealed && !hideSlot && <span>Tuş: <b style={{ color: 'var(--gold)' }}>{slot}</b></span>}
          {!revealed && !unlocked(rules.abilityNameAt, wrongCount, false) && (
            <span>
              {rules.abilityNameAt === null
                ? 'Bu zorlukta ipucu yok'
                : `İpucu: ${rules.abilityNameAt} yanlışta yetenek adı`}
            </span>
          )}
        </div>
      </div>
    )
  }

  if (puzzle.sub === 'lore') {
    return <LoreView champion={puzzle.champion} wrongCount={wrongCount} revealed={revealed} rules={rules} />
  }

  if (puzzle.sub === 'quote') {
    return <QuoteView champion={puzzle.champion} wrongCount={wrongCount} revealed={revealed} rules={rules} />
  }

  if (puzzle.sub === 'emoji') {
    const all = EMOJI[puzzle.champion.id] ?? []
    // Kaç tanesi açık: zorluğa göre başlangıç + kaç yanlışta bir yenisi
    const extra = rules.emojiStep > 0 ? Math.floor(wrongCount / rules.emojiStep) : 0
    const shown = revealed ? all.length : Math.min(all.length, rules.emojiStart + extra)
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap justify-center gap-2">
          {all.map((e, i) => (
            <span
              key={i}
              className={`flex h-14 w-14 items-center justify-center rounded-xl border text-3xl ${i < shown ? 'anim-pop' : ''}`}
              style={{
                background: 'var(--bg-card)',
                borderColor: i < shown ? 'var(--gold)' : 'var(--border)',
              }}
              aria-label={i < shown ? 'İpucu' : 'Kilitli ipucu'}
            >
              {i < shown ? e : '❔'}
            </span>
          ))}
        </div>
        <div className="min-h-5 text-sm" style={{ color: 'var(--text-dim)' }}>
          {shown >= all.length ? (
            <span>Bütün ipuçları açık</span>
          ) : rules.emojiStep === 0 ? (
            <span>Bu zorlukta yeni emoji açılmaz</span>
          ) : rules.emojiStep === 1 ? (
            <span>İpucu: her yanlışta bir emoji daha açılır</span>
          ) : (
            <span>İpucu: her {rules.emojiStep} yanlışta bir emoji daha açılır</span>
          )}
        </div>
      </div>
    )
  }

  if (puzzle.sub === 'silhouette') {
    /*
     * Silüet: yükleme ekranı görseli (şampiyon ortada, tam boy) sertçe eşiklenir —
     * renk ve doku gider, geriye duruş ve hatlar kalır. Her yanlışta eşik gevşer.
     * Şeffaf PNG'li gerçek silüet varlığı YOK; CSS filtresi bu yüzden seçildi:
     * ek dosya inmiyor, çevrimdışı çalışıyor.
     */
    const steps = Math.max(1, rules.silhouetteReveals)
    const p = revealed ? 1 : Math.min(1, wrongCount / steps) // 0 = tam silüet, 1 = açık
    const contrast = 8 - p * 7 // 8 → 1
    const brightness = 0.35 + p * 0.65 // 0.35 → 1
    const gray = 1 - p // renk yavaşça geri gelir
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className="h-52 w-36 overflow-hidden rounded-xl border sm:h-64 sm:w-44"
          style={{
            borderColor: 'var(--border)',
            backgroundImage: `url(${loadingUrl(puzzle.champion.id, 0)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: `grayscale(${gray}) contrast(${contrast}) brightness(${brightness})`,
            transition: 'filter 0.5s ease',
          }}
          role="img"
          aria-label={revealed ? puzzle.champion.name : 'Karartılmış şampiyon görseli'}
        />
        <div className="min-h-5 text-xs" style={{ color: 'var(--text-dim)' }}>
          {revealed
            ? <span>{puzzle.champion.name}</span>
            : <span>Her yanlışta görsel biraz aydınlanır ({Math.min(wrongCount, steps)}/{steps})</span>}
        </div>
      </div>
    )
  }

  if (puzzle.sub === 'splash') {
    // Her yanlışta uzaklaş; başlangıç ve adım zorluktan gelir, bitince tam görsel
    const zoom = Math.max(150, rules.zoomStart - wrongCount * rules.zoomStep)
    const crop = puzzle.crop ?? { x: 50, y: 50 }
    return (
      <div
        className="aspect-video w-full max-w-[260px] overflow-hidden rounded-xl border"
        style={{
          borderColor: 'var(--border)',
          backgroundImage: `url(${splashUrl(puzzle.champion.id, puzzle.splashNum ?? 0)})`,
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
  // Kostüm başlangıçta biraz daha yakın: görselde şampiyon yerine kostüm aranıyor
  const zoom = Math.max(150, rules.zoomStart + 200 - wrongCount * (rules.zoomStep + 20))
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
        {unlocked(rules.skinChampionAt, wrongCount, revealed) ? (
          <span>Şampiyon: <b style={{ color: 'var(--gold)' }}>{puzzle.champion.name}</b></span>
        ) : rules.skinChampionAt === null ? (
          <span>Bu zorlukta ipucu yok</span>
        ) : (
          <span>İpucu: {rules.skinChampionAt} yanlışta şampiyon adı</span>
        )}
      </div>
    </div>
  )
}
