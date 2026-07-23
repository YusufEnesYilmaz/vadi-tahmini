import { useEffect } from 'react'
import { SUB_MODES, type SubMode } from '../game/types'
import DifficultyTable from './DifficultyTable'

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
  quote: 'Şampiyonun Türkçe seslendirmesini dinle ve kimin konuştuğunu bul. Sesin açık olmalı. İlk klip yasaklanma repliği; iki yanlıştan sonra seçilme repliği de açılır.',
  emoji: 'Şampiyonu anlatan emojilerden bul. Tek emojiyle başlarsın, her yanlış tahminde bir tanesi daha açılır — sondakiler en belirgin ipuçlarıdır.',
  silhouette: 'Şampiyonun karartılmış görselinden kim olduğunu bul. Renk ve doku silinir, geriye duruş ve hatlar kalır; her yanlış tahminde görsel biraz daha aydınlanır.',
  lore: 'Şampiyonun hikâyesini oku ve kim olduğunu bul. Adı metinden silinir (█████); her yanlış tahminde bir cümle daha açılır.',
  item: 'Eşyayı ipuçlarından bul — ikon başta KAPALIDIR. Önce sadece altın değerini görürsün; yanlış tahminlerde sırayla stat etiketleri, bileşen ikonları ve en sonda eşyanın kendi ikonu açılır — ikon önce silik ve bulanık gelir, sonraki yanlışlarda netleşir. Havuzda Summoner’s Rift’te satılan 1600+ altınlık tam eşyalar var.',
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
  const showLegend = !sub || sub === 'classic' // renk anahtarı sadece Klasik'i ilgilendirir

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 sm:items-center ovl"
      style={{ background: 'var(--overlay)' }}
      onClick={onClose}
    >
      <div
        className="anim-pop my-auto w-full max-w-3xl rounded-2xl border p-5 sm:p-6 panel"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Nasıl oynanır"
      >
        {/* Başlık Çubuğu */}
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <h2 className="font-display text-xl font-bold tracking-wide" style={{ color: 'var(--gold-bright)' }}>
              Nasıl Oynanır Rehberi
            </h2>
          </div>
          <button
            onClick={onClose}
            className="card-btn rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-transform hover:scale-105"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          >
            ✕ Kapat
          </button>
        </div>

        {/* Ana Amaç Özeti Banner */}
        <div className="mt-4 rounded-xl border p-3.5" style={{ background: 'rgba(var(--gold-glow-rgb), 0.06)', borderColor: 'rgba(var(--gold-glow-rgb), 0.25)' }}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--gold-bright)' }}>
            <span>🎯</span>
            <span>Temel Amaç</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text)' }}>
            İpuçlarını kullanarak doğru şampiyonu veya eşyayı bul. Sınırsız ve Günlük modlarında tahmin hakkın sınırlıdır (zorluğa göre 5–10 hak); Zamana Karşı modunda ise hak sınırı olmadan süreye karşı yarışırsın.
          </p>
        </div>

        {/* Mod Tanıtım Kartları Grid */}
        <div className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
            🎮 {sub ? 'Aktif Mod İpuçları' : 'Tahmin Modları'}
          </h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modes.map((m) => (
              <div
                key={m.id}
                className="group rounded-xl border p-3 transition-all hover:scale-[1.01]"
                style={{ borderColor: 'var(--border)', background: 'rgba(255, 255, 255, 0.015)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl transition-transform group-hover:scale-110">{m.icon}</span>
                  <span className="font-bold text-sm" style={{ color: 'var(--gold)' }}>{m.name}</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>{MODE_HOWTO[m.id]}</p>
              </div>
            ))}
            {/* Karışık Mod Kartı */}
            {!sub && (
              <div
                className="group rounded-xl border p-3 transition-all hover:scale-[1.01]"
                style={{ borderColor: 'rgba(var(--gold-glow-rgb), 0.4)', background: 'rgba(var(--gold-glow-rgb), 0.04)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl transition-transform group-hover:scale-110">🎲</span>
                  <span className="font-bold text-sm" style={{ color: 'var(--gold-bright)' }}>Karışık</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                  Her soru rastgele başka bir alt moddan gelir. Sınırsız ve Zamana Karşı modlarında sürpriz bir yarışma deneyimi sunar.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Klasik Renkler ve Oyun Türleri Grid */}
        <div className={`mt-5 grid gap-4 ${showLegend ? 'sm:grid-cols-2' : ''}`}>
          {showLegend && (
            <section className="rounded-xl border p-3.5" style={{ borderColor: 'var(--border)', background: 'rgba(255, 255, 255, 0.01)' }}>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
                🎨 Klasik Tablosundaki Renkler
              </h3>
              <div className="mt-2.5 flex flex-col gap-2">
                {CLASSIC_LEGEND.map((l) => (
                  <div key={l.title} className="flex items-center gap-3 rounded-lg border p-2 text-xs" style={{ borderColor: 'rgba(255, 255, 255, 0.05)', background: 'rgba(255, 255, 255, 0.02)' }}>
                    <span className="h-6 w-6 shrink-0 rounded-md shadow-sm" style={{ background: l.color }} />
                    <div className="flex flex-col">
                      <b className="text-white text-xs">{l.title}</b>
                      <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{l.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-xl border p-3.5" style={{ borderColor: 'var(--border)', background: 'rgba(255, 255, 255, 0.01)' }}>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
              ⚙️ Oyun Türleri
            </h3>
            <div className="mt-2.5 flex flex-col gap-2 text-xs">
              <div className="flex items-start gap-2.5 rounded-lg border p-2" style={{ borderColor: 'rgba(255, 255, 255, 0.05)', background: 'rgba(255, 255, 255, 0.02)' }}>
                <span className="text-base">♾️</span>
                <div>
                  <b className="text-white text-xs block">Sınırsız Mod</b>
                  <span className="text-[11px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                    Arka arkaya dilediğin kadar oyna. Sıralama sana özeldir.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-lg border p-2" style={{ borderColor: 'rgba(255, 255, 255, 0.05)', background: 'rgba(255, 255, 255, 0.02)' }}>
                <span className="text-base">📅</span>
                <div>
                  <b className="text-white text-xs block">Günlük Mod</b>
                  <span className="text-[11px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                    Herkese her gün aynı bulmaca verilir. Skorunu arkadaşlarınla kıyasla.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-lg border p-2" style={{ borderColor: 'rgba(255, 255, 255, 0.05)', background: 'rgba(255, 255, 255, 0.02)' }}>
                <span className="text-base">⏱️</span>
                <div>
                  <b className="text-white text-xs block">Zamana Karşı</b>
                  <span className="text-[11px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                    Süre bitmeden kaç doğru yapabilirsin? Takıldığın soruyu "Pas" ile atla.
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Mini Oyunlar */}
        {!sub && (
          <section className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
              🕹️ Mini Oyunlar
            </h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border p-3.5 transition-all hover:scale-[1.01]" style={{ borderColor: 'var(--border)', background: 'rgba(255, 255, 255, 0.015)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔡</span>
                  <span className="font-bold text-sm" style={{ color: 'var(--gold)' }}>Kelime (Wordle)</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                  Gizli şampiyon adını 6 hakkın bitmeden harf harf tahmin et. Yeşil harf doğru konumda, kehribar harf kelimede var ama yeri farklı, gri harf isimde yok demektir. 5 ve 6 harfli seçenekleri bulunur.
                </p>
              </div>
              <div className="rounded-xl border p-3.5 transition-all hover:scale-[1.01]" style={{ borderColor: 'var(--border)', background: 'rgba(255, 255, 255, 0.015)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎲</span>
                  <span className="font-bold text-sm" style={{ color: 'var(--gold)' }}>Bingo</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                  90 saniye içinde 12 kutuluk Bingo kartını doldur. Üstten gelen şampiyona uygun özellikteki (bölge, koridor, cinsiyet, yıl vb.) boş kutuya tıklayarak şampiyonu yerleştir. Süre dolmadan 12/12 tam kart yapmaya çalış.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Zorluk Tablosu Section */}
        <section className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
            🎚️ Zorluk Seviyeleri Karşılaştırması
          </h3>
          <DifficultyTable />
        </section>
      </div>
    </div>
  )
}
