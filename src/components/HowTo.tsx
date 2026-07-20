import { useEffect } from 'react'
import { SUB_MODES, type SubMode } from '../game/types'

interface Props {
  sub?: SubMode // oyun içinden açıldıysa o modun anlatımı öne çıkar
  onClose: () => void
}

const CLASSIC_LEGEND: { color: string; title: string; desc: string }[] = [
  { color: 'var(--correct)', title: 'Yeşil', desc: 'Bu özellik birebir tutuyor' },
  { color: 'var(--partial)', title: 'Kehribar', desc: 'Kısmen tutuyor — örneğin iki koridordan biri aynı' },
  { color: 'var(--wrong)', title: 'Gri', desc: 'Hiç tutmuyor' },
]

const MODE_HOWTO: Record<SubMode, string> = {
  classic: 'Bir şampiyon tahmin et; tablo her özelliğin tutup tutmadığını renklerle gösterir. Yıl hücresindeki ↑ / ↓ okları, aradığın şampiyonun daha yeni mi yoksa daha eski mi olduğunu söyler.',
  ability: 'Ekrandaki yetenek ikonunun hangi şampiyona ait olduğunu bul. Bildikten sonra bir bonus soru gelir: bu yetenek hangi tuşta? (Pasif / Q / W / E / R)',
  splash: 'Splash art’ın küçük bir parçasıyla başlarsın. Her yanlış tahminde görsel biraz daha açılır.',
  skin: 'Görseldeki kostümün adını bul — şampiyonu değil. Üç yanlıştan sonra şampiyon adı ipucu olarak verilir.',
}

/** Nasıl oynanır penceresi — menüden ve oyun içindeki "?" butonundan açılır */
export default function HowTo({ sub, onClose }: Props) {
  // Escape ile kapansın (masaüstünde beklenen davranış)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const modes = sub ? SUB_MODES.filter((m) => m.id === sub) : SUB_MODES

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 sm:items-center"
      style={{ background: 'rgba(4, 7, 15, 0.75)' }}
      onClick={onClose}
    >
      <div
        className="anim-pop my-auto w-full max-w-md rounded-2xl border p-5 shadow-2xl"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Nasıl oynanır"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold" style={{ color: 'var(--gold-bright)' }}>Nasıl oynanır</h2>
          <button onClick={onClose} className="card-btn rounded-lg border px-3 py-1 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            Kapat
          </button>
        </div>

        <p className="mt-3 text-sm" style={{ color: 'var(--text-dim)' }}>
          Amaç tek: doğru şampiyonu bulmak. Tahmin hakkın sınırsız — kaç denemede bildiğin sayılır.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          {modes.map((m) => (
            <div key={m.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{m.icon}</span>
                <span className="font-bold" style={{ color: 'var(--gold)' }}>{m.name}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>{MODE_HOWTO[m.id]}</p>
            </div>
          ))}
        </div>

        {(!sub || sub === 'classic') && (
          <>
            <h3 className="mt-5 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
              Klasik tablosundaki renkler
            </h3>
            <div className="mt-2 flex flex-col gap-2">
              {CLASSIC_LEGEND.map((l) => (
                <div key={l.title} className="flex items-center gap-3">
                  <span className="h-8 w-8 shrink-0 rounded-md" style={{ background: l.color }} />
                  <span className="text-sm">
                    <b>{l.title}</b>
                    <span style={{ color: 'var(--text-dim)' }}> — {l.desc}</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <h3 className="mt-5 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
          Modlar
        </h3>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm" style={{ color: 'var(--text-dim)' }}>
          <li><b style={{ color: 'var(--text)' }}>Sınırsız</b> — arka arkaya oyna. Sıran sana özel, arkadaşınla aynı şampiyon gelmez.</li>
          <li><b style={{ color: 'var(--text)' }}>Günlük</b> — herkese aynı bulmaca, günde bir. Sonucu paylaşıp karşılaştırın.</li>
          <li><b style={{ color: 'var(--text)' }}>Zamana Karşı</b> — 60 saniyede kaç doğru? Takıldığını "Pas" ile geç.</li>
        </ul>
      </div>
    </div>
  )
}
