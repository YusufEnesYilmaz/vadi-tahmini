export type GuideKey = 'champions' | 'items' | 'howto'

interface Props {
  active: GuideKey
  onSelect: (key: GuideKey) => void
}

const GUIDE_TABS: { key: GuideKey; label: string; mobileLabel?: string }[] = [
  { key: 'champions', label: 'Şampiyonlar' },
  { key: 'items', label: 'Eşyalar' },
  { key: 'howto', label: 'Nasıl Oynanır', mobileLabel: 'Nasıl Oyn.' },
]

export default function GuideTabs({ active, onSelect }: Props) {
  return (
    <nav aria-label="Rehber bölümleri" className="w-full min-w-0">
      <div
        className="menu-mini-actions flex w-full min-w-0 rounded-xl border p-1"
        style={{
          borderColor: 'rgba(var(--gold-rgb), 0.16)',
          background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.76), rgba(var(--bg-rgb), 0.68))',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        }}
      >
        {GUIDE_TABS.map((tab, index) => {
          const isActive = tab.key === active
          const isFirst = index === 0
          const isLast = index === GUIDE_TABS.length - 1

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                if (!isActive) onSelect(tab.key)
              }}
              aria-current={isActive ? 'page' : undefined}
              title={tab.label}
              className={[
                'menu-seg flex min-w-0 flex-1 items-center justify-center px-2 py-2 text-center text-xs font-bold sm:px-3 sm:text-sm',
                isFirst ? 'rounded-l-lg' : '',
                isLast ? 'rounded-r-lg' : '',
                index > 0 ? 'border-l' : '',
                isActive ? 'cursor-default' : '',
              ].join(' ')}
              style={{
                borderColor: index > 0 ? 'rgba(var(--gold-rgb), 0.12)' : undefined,
                background: isActive
                  ? 'linear-gradient(180deg, rgba(var(--gold-rgb), 0.22), rgba(var(--hextech-rgb), 0.16))'
                  : 'transparent',
                color: isActive ? 'var(--gold-bright)' : 'var(--text-dim)',
                boxShadow: isActive
                  ? 'inset 0 0 0 1px rgba(var(--gold-rgb), 0.26), 0 0 24px -16px rgba(var(--hextech-rgb), 0.72)'
                  : 'none',
              }}
            >
              <span className="min-w-0 truncate sm:hidden">{tab.mobileLabel ?? tab.label}</span>
              <span className="hidden min-w-0 truncate sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
