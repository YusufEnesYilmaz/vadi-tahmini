import { useEffect, useRef, useState } from 'react'
import { searchKey } from '../game/data'

export interface AcOption {
  key: string
  label: string
  img?: string
  sub?: string // küçük alt yazı (kostüm modunda şampiyon adı)
}

interface Props {
  options: AcOption[]
  placeholder: string
  disabledKeys?: Set<string>
  onPick: (key: string) => void
  autoFocus?: boolean
  maxResults?: number // liste kaydırılabilir; kostüm modu gibi geniş havuzlarda artırılır
}

/** TR duyarlı (İ/ı, aksan, kesme işareti) arama yapan otomatik tamamlama */
export default function Autocomplete({ options, placeholder, disabledKeys, onPick, autoFocus, maxResults = 8 }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const q = searchKey(query)

  // Sıralama: etiket başlangıcı > alt yazı başlangıcı > etiket içinde > alt yazı içinde
  function rank(o: AcOption): number {
    const l = searchKey(o.label)
    const s = o.sub ? searchKey(o.sub) : ''
    if (l.startsWith(q)) return 0
    if (s.startsWith(q)) return 1
    if (l.includes(q)) return 2
    return 3
  }

  const matches = q
    ? options
        .filter((o) =>
          !disabledKeys?.has(o.key) &&
          (searchKey(o.label).includes(q) || (o.sub !== undefined && searchKey(o.sub).includes(q))))
        .sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label, 'tr'))
        .slice(0, maxResults)
    : []

  useEffect(() => setHi(0), [query])

  // Seçili öğeyi görünür tut
  useEffect(() => {
    listRef.current?.children[hi]?.scrollIntoView({ block: 'nearest' })
  }, [hi])

  function pick(key: string) {
    setQuery('')
    setOpen(false)
    onPick(key)
    inputRef.current?.focus()
  }

  /*
   * Erişilebilirlik: bu bir combobox. Görsel olarak çalışıyordu ama ekran okuyucuya
   * hiçbir şey söylemiyordu — kaç sonuç var, hangisi seçili, liste açık mı bilinmiyordu.
   * ARIA kalıbı: input[role=combobox] + aria-activedescendant → listbox → option'lar.
   * Odak input'ta KALIR; seçili seçenek `aria-activedescendant` ile bildirilir
   * (klavye mantığı bu yüzden hiç değişmedi).
   */
  const listOpen = open && matches.length > 0
  const listId = 'ac-list'
  const optionId = (i: number) => `ac-opt-${i}`

  return (
    <div className="relative w-full">
      {/* Sonuç sayısını duyur — görsel kullanıcı listeyi görüyor, ekran okuyucu duymalı */}
      <span className="sr-only" role="status" aria-live="polite">
        {listOpen ? `${matches.length} sonuç bulundu` : ''}
      </span>
      <input
        ref={inputRef}
        value={query}
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={listOpen}
        aria-controls={listId}
        aria-activedescendant={listOpen ? optionId(hi) : undefined}
        aria-autocomplete="list"
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => query && setOpen(true)}
        onKeyDown={(e) => {
          if (!matches.length) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, matches.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)) }
          else if (e.key === 'Enter') { e.preventDefault(); pick(matches[hi].key) }
          else if (e.key === 'Escape') setOpen(false)
        }}
        placeholder={placeholder}
        className="w-full rounded-xl border px-4 py-3 text-base outline-none focus:border-[var(--gold)]"
        style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {listOpen && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Tahmin önerileri"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border shadow-xl"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          {matches.map((o, i) => (
            <button
              key={o.key}
              id={optionId(i)}
              role="option"
              aria-selected={i === hi}
              // Odak input'tan KAÇMASIN: mousedown'ı engellemek blur'u da engeller,
              // böylece tıklama seçimi kaybolmuyor (aşağıdaki 150 ms yedek koruma).
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(o.key)}
              onMouseEnter={() => setHi(i)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left"
              style={{ background: i === hi ? 'var(--bg-input)' : 'transparent' }}
            >
              {o.img && <img src={o.img} alt="" className="h-8 w-8 rounded" loading="lazy" />}
              <span className="min-w-0">
                <span className="block truncate">{o.label}</span>
                {o.sub && <span className="block truncate text-xs" style={{ color: 'var(--text-dim)' }}>{o.sub}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
