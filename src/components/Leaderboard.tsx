import { useEffect, useState } from 'react'
import { clearSubmitFailure, getDailyLeaderboard, getSubmitFailure, getTimedLeaderboard, type LeaderboardEntry, type SubmitFailure } from '../game/supabase'
import { DAILY_SUBS, DIFFICULTIES, SUB_MODES, MIX_MODE, type Difficulty, type PlaySub } from '../game/types'
import { todayKey } from '../game/rng'
import { getPlayerId } from '../game/challenge'

interface Props {
  onClose: () => void
}

type TabMode = 'timed' | 'daily'

export default function Leaderboard({ onClose }: Props) {
  const [tab, setTab] = useState<TabMode>('timed')
  const [sub, setSub] = useState<PlaySub>('classic')
  const [diff, setDiff] = useState<Difficulty>('normal')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  // Panel açılışında son gönderim hatasını oku (varsa uyarı satırı çıkar)
  const [fail, setFail] = useState<SubmitFailure | null>(getSubmitFailure)
  // Kimlik = player_id. Takma adla karşılaştırmak HATALIYDI: aynı adı yazan iki
  // kişinin satırı da "(Sen)" oluyordu. Ad değişebilir, kimlik değişmez.
  const myId = getPlayerId()

  // ESC ile kapatma
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Veri yükleme
  useEffect(() => {
    let active = true
    setLoading(true)

    const fetchLeaderboard = async () => {
      let res: LeaderboardEntry[] = []
      if (tab === 'timed') {
        res = await getTimedLeaderboard(sub, diff)
      } else {
        res = await getDailyLeaderboard(sub === 'mix' ? 'classic' : sub, todayKey())
      }
      if (active) {
        setEntries(res)
        setLoading(false)
      }
    }

    fetchLeaderboard()

    return () => {
      active = false
    }
  }, [tab, sub, diff])

  // Tab değiştiğinde mix alt modunu sıfırla (Günlük'te karışık mod yok)
  const handleTabChange = (t: TabMode) => {
    setTab(t)
    if (t === 'daily' && sub === 'mix') {
      setSub('classic')
    }
  }

  // Mod listesi: Günlük'te Karışık (mix) yok
  const availableSubs = tab === 'daily' ? DAILY_SUBS : [...SUB_MODES, MIX_MODE]

  return (
    <div className="ovl fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 sm:items-center"
      style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="panel anim-pop my-auto w-full max-w-lg rounded-2xl border p-5"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Sıralama Tablosu">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold" style={{ color: 'var(--gold-bright)' }}>
            🏆 Küresel Sıralama
          </h2>
          <button onClick={onClose} className="card-btn rounded-xl border px-3 py-1 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            Kapat
          </button>
        </div>

        {/*
          Gönderim başarısızlığı uyarısı. Bu satırın var olma sebebi: skor gönderimi
          2026-07-23'e kadar sessizce başarısız oluyordu ve hiçbir yerde iz yoktu —
          sıralama "boş" görünüyor, kimse sebebini bilmiyordu. Alarm tonu DEĞİL:
          sıralama görünmeye devam eder, bu yalnız durumu bildirir.
          Otomatik yeniden deneme YOK — tutulamayacak söz verilmiyor.
        */}
        {fail && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border p-2.5 text-xs"
            style={{ borderColor: 'rgba(var(--gold-glow-rgb),0.35)', background: 'rgba(var(--gold-glow-rgb),0.06)' }}>
            <span aria-hidden>⚠</span>
            <span className="min-w-0">
              <b style={{ color: 'var(--partial)' }}>Son skorun sıralamaya yazılamadı.</b>
              <span className="block" style={{ color: 'var(--text-dim)' }}>
                {new Date(fail.at).toLocaleString('tr-TR')} · {fail.mode}
                {fail.msg && <span className="block opacity-70">{fail.msg}</span>}
                <span className="block">Yeni bir tur bitirdiğinde tekrar denenir.</span>
              </span>
            </span>
            <button
              onClick={() => { clearSubmitFailure(); setFail(null) }}
              className="ml-auto shrink-0 rounded-lg border px-2 py-0.5"
              style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
              Gizle
            </button>
          </div>
        )}

        {/* Üst Mod Sekmeleri */}
        <div className="mt-4 flex rounded-xl border p-1" style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}>
          <button onClick={() => handleTabChange('timed')}
            className="flex-1 rounded-lg py-2 text-sm font-bold transition-all"
            style={{
              background: tab === 'timed' ? 'var(--gold)' : 'transparent',
              color: tab === 'timed' ? 'var(--on-gold)' : 'var(--text-dim)',
            }}>
            ⏱ Zamana Karşı
          </button>
          <button onClick={() => handleTabChange('daily')}
            className="flex-1 rounded-lg py-2 text-sm font-bold transition-all"
            style={{
              background: tab === 'daily' ? 'var(--gold)' : 'transparent',
              color: tab === 'daily' ? 'var(--on-gold)' : 'var(--text-dim)',
            }}>
            📅 Günlük
          </button>
        </div>

        {/* Filtre Alanı */}
        <div className="mt-3 flex flex-col gap-2">
          {/* Alt Mod Seçici */}
          <div className="flex flex-wrap gap-1.5 justify-center">
            {availableSubs.map((m) => (
              <button key={m.id} onClick={() => setSub(m.id)}
                className="rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all"
                style={{
                  background: sub === m.id ? 'var(--gold-soft)' : 'transparent',
                  borderColor: sub === m.id ? 'var(--gold)' : 'var(--border)',
                  color: sub === m.id ? 'var(--gold-bright)' : 'var(--text-dim)',
                }}>
                {m.icon} {m.name}
              </button>
            ))}
          </div>

          {/* Zorluk Seçici (Sadece Zamana Karşı için) */}
          {tab === 'timed' && (
            <div className="mx-auto flex overflow-hidden rounded-lg border w-fit" style={{ borderColor: 'var(--border)' }}>
              {DIFFICULTIES.map((d) => (
                <button key={d.id} onClick={() => setDiff(d.id)}
                  className="px-3 py-1 text-xs font-bold transition-colors"
                  style={{
                    background: diff === d.id ? 'var(--gold)' : 'transparent',
                    color: diff === d.id ? 'var(--on-gold)' : 'var(--text-dim)',
                  }}>
                  {d.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Skor bölümü: yükleniyor / boş / podyum + liste */}
        {loading ? (
          <div className="mt-4 flex h-64 items-center justify-center gap-2 rounded-xl border"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--gold)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>Yükleniyor...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="mt-4 flex h-64 flex-col items-center justify-center rounded-xl border p-4 text-center"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}>
            <span className="mb-2 text-4xl anim-pop">🏁</span>
            <span className="font-display text-base font-bold" style={{ color: 'var(--gold-bright)' }}>Henüz Skor Yok</span>
            <span className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>
              Bu modu oyna, tabelanın zirvesine adını ilk sen yaz.
            </span>
          </div>
        ) : (
          <>
            {/* Podyum — ilk üç (yeterince kayıt varsa). Merkez en yüksek: 2 · 1 · 3 */}
            {entries.length >= 3 && (
              <div className="mt-4 grid grid-cols-3 items-end gap-2">
                {[{ e: entries[1], rank: 2 }, { e: entries[0], rank: 1 }, { e: entries[2], rank: 3 }].map(({ e, rank }) => {
                  const isMe = e.playerId === myId
                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
                  const barH = rank === 1 ? 'h-16' : rank === 2 ? 'h-12' : 'h-10'
                  const val = String(e.score)
                  return (
                    <div key={`podium-${rank}`} className="anim-pop flex flex-col items-center">
                      <span className={rank === 1 ? 'text-3xl' : 'text-2xl'}>{medal}</span>
                      <span className="mt-0.5 max-w-full truncate px-1 text-xs font-bold"
                        style={{ color: isMe ? 'var(--gold-bright)' : 'var(--text)' }}>
                        {e.nick}
                      </span>
                      <span className="text-[11px] font-bold tabular-nums" style={{ color: 'var(--gold)' }}>{val}</span>
                      <div className={`mt-1 flex w-full items-start justify-center rounded-t-lg border-t border-x pt-1 ${barH}`}
                        style={{
                          borderColor: rank === 1 ? 'var(--gold)' : 'var(--border)',
                          background: rank === 1 ? 'var(--gold-soft)' : 'var(--bg-input)',
                          boxShadow: rank === 1 ? '0 0 22px -6px rgba(var(--gold-rgb), 0.5)' : 'none',
                        }}>
                        <span className="font-display text-lg font-bold" style={{ color: rank === 1 ? 'var(--gold-bright)' : 'var(--text-dim)' }}>{rank}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Kalan sıralama (podyum varsa 4+, yoksa hepsi) */}
            <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border pr-1" style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}>
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b text-[10px] uppercase tracking-wider" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
                    <th className="py-2 pl-3 w-16 text-center">Sıra</th>
                    <th className="py-2 pl-2">Oyuncu</th>
                    <th className="py-2 pr-3 text-right">Skor</th>
                  </tr>
                </thead>
                <tbody>
                  {(entries.length >= 3 ? entries.slice(3) : entries).map((entry, index) => {
                    const rank = (entries.length >= 3 ? 4 : 1) + index
                    const isMe = entry.playerId === myId
                    const rankBadge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`

                    return (
                      <tr key={`${entry.nick}-${index}`}
                        className="border-b border-transparent transition-colors"
                        style={{
                          background: isMe ? 'var(--gold-soft)' : 'transparent',
                          borderColor: isMe ? 'var(--gold)' : 'transparent',
                        }}>
                        <td className="py-2 text-center font-bold tabular-nums" style={{ color: rank <= 3 ? 'inherit' : 'var(--text-dim)' }}>
                          {rankBadge}
                        </td>
                        <td className="py-2 pl-2 font-semibold truncate max-w-[150px]"
                          style={{ color: isMe ? 'var(--gold-bright)' : 'var(--text)' }}>
                          {entry.nick} {isMe && <span className="text-[10px] ml-1 opacity-75">(Sen)</span>}
                        </td>
                        <td className="py-2 pr-3 text-right font-bold tabular-nums"
                          style={{ color: isMe ? 'var(--gold-bright)' : 'var(--gold)' }}>
                          {tab === 'timed' ? `${entry.score} doğru` : `${entry.score} tahmin`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <p className="mt-3 text-center text-[10px]" style={{ color: 'var(--text-dim)' }}>
          Ayarlar'daki takma adınla skorların otomatik olarak buraya kaydedilir.
        </p>
      </div>
    </div>
  )
}
