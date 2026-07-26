import { useEffect, useRef, useState } from 'react'
import { getNick, setNick } from '../game/challenge'
import { markOnboarded } from '../game/onboarding'
import { DIFFICULTIES, SUB_MODES, TOP_MODES } from '../game/types'
import { useModalFocusTrap } from './useModalFocusTrap'

/*
 * İlk girişe özel öğretici — 3 adım (kullanıcı kararı, 2026-07-26).
 *
 * Tam anlatımı KOPYALAMAZ: burada yalnız "bu oyun ne, nereden başlanır" var;
 * ayrıntı Oyuncu Rehberi > Nasıl Oynanır'da duruyor.
 *
 * ⚠ Metinlerde mod/zorluk SAYISI elle yazılmaz — `TOP_MODES`/`SUB_MODES`/
 * `DIFFICULTIES`'ten türetilir. Bu depoda elle yazılan sayı iki kez yalan söyledi
 * (`share.ts` "60 saniyede", `Stats.tsx` "6 modun da"), aynı tuzağa düşülmesin.
 * Mini oyunların dışa açık bir liste sabiti YOK → sayı verilmez, örnekle anlatılır.
 */

const TOTAL_STEPS = 3

/** Zorluk adları: "Kolay → Aşırı Zor" (uçlar veriden) */
const DIFF_RANGE = `${DIFFICULTIES[0].name} → ${DIFFICULTIES[DIFFICULTIES.length - 1].name}`

/** Örnek tahmin türleri — `slice` ile sınır güvenli (dizi kısalsa da patlamaz) */
const SUB_SAMPLE = SUB_MODES.slice(0, 4)
  .map((m) => m.name)
  .join(', ')

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <span
          key={i}
          className="h-1.5 rounded-full transition-all"
          style={{
            width: i === step ? '1.4rem' : '0.375rem',
            background: i === step ? 'var(--gold)' : 'rgba(var(--gold-rgb), 0.28)',
          }}
        />
      ))}
    </div>
  )
}

function Row({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-base leading-none"
        style={{
          borderColor: 'rgba(var(--gold-rgb), 0.24)',
          background: 'rgba(var(--gold-rgb), 0.08)',
        }}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0">
        <b className="block text-sm" style={{ color: 'var(--gold-bright)' }}>
          {title}
        </b>
        <span className="block text-[13px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
          {text}
        </span>
      </span>
    </li>
  )
}

export default function Onboarding({ onClose }: { onClose: () => void }) {
  const dialogRef = useModalFocusTrap<HTMLDivElement>()
  const [step, setStep] = useState(0)
  const [nick, setNickInput] = useState(getNick)

  // Escape dinleyicisi her tuşta yeniden kurulmasın diye takma ad ref'ten okunur
  // (girişte her harf state'i değiştiriyor).
  const nickRef = useRef(nick)
  nickRef.current = nick

  // Öğretici bir kez gösterilir: hangi yolla kapanırsa kapansın (Atla / Başla /
  // Escape) bayrak yazılır. Oyuncu atlamayı SEÇTİYSE ısrar etmeyiz.
  const finishRef = useRef(() => {})
  finishRef.current = () => {
    const trimmed = nickRef.current.trim()
    if (trimmed) setNick(trimmed)
    markOnboarded()
    onClose()
  }
  const finish = () => finishRef.current()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finishRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const isLast = step === TOTAL_STEPS - 1

  return (
    // Dışına tıklama BİLEREK kapatmaz: ilk girişte kazara tek tıkla öğreticiyi
    // kaybetmek kötü. Escape erişilebilirlik çıkışı olarak duruyor.
    <div
      className="ovl fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 sm:items-center"
      style={{ background: 'var(--overlay)' }}
    >
      <div
        ref={dialogRef}
        className="panel anim-pop my-auto w-full max-w-lg rounded-[26px] border p-4 sm:p-5"
        style={{ background: 'var(--bg-card)', borderColor: 'rgba(var(--gold-rgb), 0.26)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Vadi Tahmini'ne hoş geldin"
      >
        {step === 0 && (
          <div>
            <div className="text-center">
              <div className="text-4xl" aria-hidden>
                ⚔️
              </div>
              <h2 className="text-shimmer font-display mt-2 text-2xl font-extrabold">Vadi Tahmini</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-dim)' }}>
                Bil bakalım, şampiyon kim?
              </p>
            </div>
            <ul className="mt-5 flex flex-col gap-3.5">
              <Row
                icon="🎯"
                title="Gizli bir şampiyon var"
                text="Sana ipuçları verilir, sen kim olduğunu tahmin edersin. Adı yazmaya başlayınca liste çıkar, birini seç."
              />
              <Row
                icon="💡"
                title="Her yanlış yeni ipucu açar"
                text="Bilemezsen üzülme — ipuçları sırayla açılır ve şampiyon adım adım belirginleşir. Hakkın bitmeden bulmaya çalış."
              />
              <Row
                icon="📊"
                title="İlerlemen kaydedilir"
                text="Serilerin, rekorların ve rozetlerin bu cihazda tutulur. Ayarlar'dan yedek alıp başka cihaza taşıyabilirsin."
              />
            </ul>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="section-label" style={{ color: 'var(--gold)' }}>
              Nasıl oynanır
            </div>
            <h2 className="font-display mt-1 text-xl font-bold" style={{ color: 'var(--gold-bright)' }}>
              Önce bir mod seç
            </h2>
            <ul className="mt-4 flex flex-col gap-3.5">
              {TOP_MODES.map((mode) => (
                <Row key={mode.id} icon={mode.icon} title={mode.name} text={mode.desc} />
              ))}
            </ul>
            <div
              className="mt-4 rounded-2xl border px-3.5 py-3 text-[13px] leading-relaxed"
              style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
            >
              Sonra <b style={{ color: 'var(--text)' }}>ne tahmin edeceğini</b> seçersin: {SUB_MODES.length} farklı tür
              var — {SUB_SAMPLE}… Zorluk da sende: <b style={{ color: 'var(--text)' }}>{DIFF_RANGE}</b>. Zorluk arttıkça
              hakkın azalır, ipuçları cimrileşir.
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="section-label" style={{ color: 'var(--gold)' }}>
              Son bir şey
            </div>
            <h2 className="font-display mt-1 text-xl font-bold" style={{ color: 'var(--gold-bright)' }}>
              Dahası da var
            </h2>
            <ul className="mt-4 flex flex-col gap-3.5">
              <Row
                icon="🕹️"
                title="Mini oyunlar"
                text="Kelime, Bingo, Zaman Tüneli gibi bambaşka oyunlar ana menüde seni bekliyor. Hepsinin günlüğü de var."
              />
              <Row
                icon="📚"
                title="Oyuncu Rehberi"
                text="Şampiyonları ve eşyaları tanımıyorsan buradan keşfet. Tam kural anlatımı da orada — istediğin an dönebilirsin."
              />
            </ul>

            <div className="mt-4">
              <label htmlFor="onboarding-nick" className="section-label mb-2 block">
                Takma adın (istersen)
              </label>
              <input
                id="onboarding-nick"
                type="text"
                value={nick}
                onChange={(e) => setNickInput(e.target.value)}
                maxLength={20}
                placeholder="Örn: Vadi Gezgini"
                autoComplete="off"
                className="w-full rounded-xl border px-3.5 py-2.5 text-sm"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                Küresel sıralamada bu adla görünürsün. Boş bırakabilirsin — sonradan Ayarlar'dan da koyabilirsin.
              </p>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <StepDots step={step} />

          <div className="flex items-center gap-2">
            {step === 0 ? (
              <button
                type="button"
                onClick={finish}
                className="rounded-xl px-3 py-2 text-xs font-semibold"
                style={{ color: 'var(--text-dim)' }}
              >
                Atla
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="card-btn rounded-xl border px-3.5 py-2 text-sm font-semibold"
                style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
              >
                Geri
              </button>
            )}

            {isLast ? (
              <button type="button" onClick={finish} className="btn-gold rounded-xl px-5 py-2 text-sm font-bold">
                Başla
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="btn-gold rounded-xl px-5 py-2 text-sm font-bold"
              >
                İleri
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
