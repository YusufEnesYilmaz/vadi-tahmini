import { useState } from 'react'
import { getDailyHistory, normalizeEntry } from '../game/stats'
import { DAILY_SUBS } from '../game/types'

const WEEKDAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa']
const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Pazartesi'yi haftanın ilk günü yap (JS'te 0=Pazar) */
function firstWeekdayIndex(y: number, m: number): number {
  return (new Date(y, m, 1).getDay() + 6) % 7
}

/**
 * Günlük takvim: hangi gün kaç mod çözülmüş, ay ay gezilebilir.
 * Renk doygunluğu o gün bitirilen mod sayısını gösterir.
 */
export default function DailyCalendar() {
  const today = new Date()
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [selected, setSelected] = useState<string | null>(null)
  const history = getDailyHistory()
  const total = DAILY_SUBS.length
  const todayStr = dateKey(today.getFullYear(), today.getMonth(), today.getDate())

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const pad = firstWeekdayIndex(view.y, view.m)
  const cells: (number | null)[] = [...Array(pad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  function shift(by: number) {
    setView((v) => {
      const d = new Date(v.y, v.m + by, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  const isFuture = view.y > today.getFullYear() || (view.y === today.getFullYear() && view.m >= today.getMonth())
  const monthDays = Object.keys(history).filter((k) => k.startsWith(`${view.y}-${String(view.m + 1).padStart(2, '0')}`))

  return (
    <div>
      <div className="flex items-center justify-between gap-2 rounded-xl border p-1.5"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}>
        <button onClick={() => shift(-1)} className="card-btn grid h-8 w-8 place-items-center rounded-lg border text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }} aria-label="Önceki ay">←</button>
        <span className="font-display text-base font-bold" style={{ color: 'var(--gold-bright)' }}>
          {MONTHS[view.m]} {view.y}
        </span>
        <button onClick={() => shift(1)} disabled={isFuture}
          className="card-btn grid h-8 w-8 place-items-center rounded-lg border text-sm disabled:opacity-30"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }} aria-label="Sonraki ay">→</button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
        {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`p${i}`} />
          const key = dateKey(view.y, view.m, day)
          // Hücre doygunluğu ÇÖZÜLEN mod sayısından gelir (0 = kaybedildi, sayılmaz)
          const done = Object.values(history[key] ?? {}).filter((v) => (normalizeEntry(v)?.g ?? 0) > 0).length
          const isToday = key === todayStr
          const isFutureDay = key > todayStr
          const isSelected = key === selected
          // Doygunluk: 1 mod soluk, hepsi tamamsa dolu altın
          const alpha = done === 0 ? 0 : 0.15 + (done / total) * 0.85
          return (
            <button key={key}
              onClick={() => setSelected(isSelected ? null : key)}
              disabled={isFutureDay}
              title={done ? `${key}: ${done}/${total} mod` : key}
              className="cal-day flex aspect-square items-center justify-center rounded-lg border text-xs tabular-nums transition-all active:scale-95 disabled:opacity-25"
              style={{
                borderColor: isSelected ? 'var(--gold-bright)' : isToday ? 'var(--gold)' : 'var(--border)',
                borderWidth: isSelected ? 2 : 1,
                background: done ? `rgba(var(--gold-rgb), ${alpha})` : 'transparent',
                color: done >= total / 2 ? 'var(--on-gold)' : 'var(--text-dim)',
                fontWeight: isToday || isSelected ? 700 : 400,
                boxShadow: isToday && !isSelected ? '0 0 10px -3px rgba(var(--gold-glow-rgb),0.6)' : 'none',
              }}>
              {day}
            </button>
          )
        })}
      </div>

      {/* Seçilen günün dökümü */}
      {selected && (
        <div className="anim-pop mt-2 rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
              {selected}
              {selected === todayStr && ' · bugün'}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
              {Object.values(history[selected] ?? {}).filter((v) => (normalizeEntry(v)?.g ?? 0) > 0).length}/{total} mod
            </span>
          </div>
          <div className="grid gap-1 sm:grid-cols-2">
            {DAILY_SUBS.map((m) => {
              // undefined = oynanmadı, g=0 = kaybedildi, g>0 = kazanıldı
              const e = normalizeEntry(history[selected]?.[m.id])
              return (
                <div key={m.id} className="flex items-baseline gap-2 text-xs">
                  <span>{m.icon}</span>
                  <span style={{ color: e ? 'var(--text)' : 'var(--text-dim)' }}>{m.name}</span>
                  {/* O günün cevabı — yalnız kaydedilmişse (eski kayıtlarda yok) */}
                  <span className="min-w-0 flex-1 truncate" style={{ color: 'var(--gold)' }}>
                    {e?.a ?? ''}
                  </span>
                  <span className="shrink-0" style={{ color: !e ? 'var(--text-dim)' : e.g > 0 ? 'var(--correct)' : 'var(--danger-text)' }}>
                    {!e ? '—' : e.g > 0 ? `✓ ${e.g} tahmin` : '✗ kaybedildi'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between rounded-lg border p-2 text-xs"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-input)', color: 'var(--text-dim)' }}>
        <span><b style={{ color: 'var(--gold-bright)' }}>{monthDays.length}</b> gün oynandı</span>
        <span className="flex items-center gap-1">
          az
          {[0.2, 0.45, 0.7, 1].map((a) => (
            <span key={a} className="h-2.5 w-2.5 rounded-sm border"
              style={{ background: `rgba(var(--gold-rgb), ${a})`, borderColor: 'var(--border)' }} />
          ))}
          çok
        </span>
      </div>
    </div>
  )
}
