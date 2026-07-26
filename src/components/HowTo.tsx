import { useEffect } from 'react'
import { SUB_MODES, type SubMode } from '../game/types'
import DifficultyTable from './DifficultyTable'
import GuideTabs, { type GuideKey } from './GuideTabs'
import { useModalFocusTrap } from './useModalFocusTrap'

interface Props {
  sub?: SubMode
  onClose: () => void
  variant?: 'modal' | 'page'
  onNavigate?: (key: GuideKey) => void
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
  item: 'Eşyayı ipuçlarından bul — ikon başta kapalıdır. Önce sadece altın değerini görürsün; yanlış tahminlerde sırayla stat etiketleri, bileşen ikonları ve en sonda eşyanın kendi ikonu açılır — ikon önce silik ve bulanık gelir, sonraki yanlışlarda netleşir. Havuzda Summoner’s Rift’te satılan 1600+ altınlık tam eşyalar var.',
}

const MINI_GAMES: { icon: string; name: string; desc: string }[] = [
  { icon: '🔡', name: 'Kelime (Wordle)', desc: 'Gizli şampiyon adını 6 hakta harf harf tahmin et. Yeşil harf doğru konumda, kehribar harf isimde var ama yeri farklı, gri harf isimde yok.' },
  { icon: '🎲', name: 'Bingo', desc: '90 saniyede 12 kutuluk kartı doldur. Üstten gelen şampiyonu uygun özellikteki (bölge, koridor, tür, yıl vb.) boş kutuya yerleştir.' },
  { icon: '🕰️', name: 'Zaman Tüneli', desc: '5 şampiyonu çıkış yılına göre eskiden yeniye sırala. Sürükle-bırak ya da ▲▼ oklarıyla diz; doğru bilinen pozisyonlar yeşile kilitlenir. 3 deneme hakkın var.' },
  { icon: '🏹', name: 'Şampiyon Avı', desc: 'Gizli şampiyonu alfabetik mesafe ipuçlarıyla 8 hakta bul. Her tahmin hedefe kaç sıra uzakta ve hangi yönde (↑/↓) olduğunu söyler. Takılırsan "🔎 İpucu aç" bölgeyi/türü verir — ama her ipucu 1 hak yakar.' },
  { icon: '🔲', name: 'Dokuz Kare', desc: '3×3 ızgarada her hücre, satır ve sütun kriterini birden sağlayan bir şampiyon ister. Hücreye dokun, yaz. Her şampiyon yalnız bir kez kullanılabilir; süre yok.' },
  { icon: '🧩', name: 'Bağlantılar', desc: '16 şampiyonu ortak özellikli 4 gizli gruba ayır. 4 seç, onayla — 4 yanlış hakkın var. Takılırsan "🔎 İpucu" bir grubun adını açar ama 1 hak yakar. Tuzaklara dikkat: bazı şampiyonlar birden çok gruba uyar gibi görünür.' },
  { icon: '🔢', name: 'Kaç Tane?', desc: 'Verilen ölçüte (ör. "Zaunlu", "Yordle") uyan şampiyonları süre dolmadan arka arkaya say. Tek başına ya da odada arkadaşlarınla canlı yarış (Multi).' },
]

function GuideBody({ sub }: { sub?: SubMode }) {
  const modes = sub ? SUB_MODES.filter((m) => m.id === sub) : SUB_MODES
  const showLegend = !sub || sub === 'classic'

  return (
    <>
      <div
        className="mt-4 rounded-xl border p-3.5"
        style={{ background: 'rgba(var(--gold-glow-rgb), 0.06)', borderColor: 'rgba(var(--gold-glow-rgb), 0.25)' }}
      >
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--gold-bright)' }}>
          <span>🎯</span>
          <span>Temel Amaç</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text)' }}>
          İpuçlarını kullanarak doğru şampiyonu veya eşyayı bul. Sınırsız ve Günlük modlarında tahmin hakkın sınırlıdır
          (zorluğa göre 5–10 hak); Zamana Karşı modunda ise hak sınırı olmadan süreye karşı yarışırsın.
        </p>
      </div>

      <div className="mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
          🎮 {sub ? 'Aktif Mod İpuçları' : 'Tahmin Modları'}
        </h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modes.map((mode) => (
            <div
              key={mode.id}
              className="group rounded-xl border p-3 transition-all hover:scale-[1.01]"
              style={{ borderColor: 'var(--border)', background: 'rgba(255, 255, 255, 0.015)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl transition-transform group-hover:scale-110">{mode.icon}</span>
                <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
                  {mode.name}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                {MODE_HOWTO[mode.id]}
              </p>
            </div>
          ))}

          {!sub && (
            <div
              className="group rounded-xl border p-3 transition-all hover:scale-[1.01]"
              style={{ borderColor: 'rgba(var(--gold-glow-rgb), 0.4)', background: 'rgba(var(--gold-glow-rgb), 0.04)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl transition-transform group-hover:scale-110">🎲</span>
                <span className="text-sm font-bold" style={{ color: 'var(--gold-bright)' }}>
                  Karışık
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                Her soru rastgele başka bir alt moddan gelir. Sınırsız ve Zamana Karşı modlarında sürpriz bir yarışma
                deneyimi sunar.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className={`mt-5 grid gap-4 ${showLegend ? 'sm:grid-cols-2' : ''}`}>
        {showLegend && (
          <section className="rounded-xl border p-3.5" style={{ borderColor: 'var(--border)', background: 'rgba(255, 255, 255, 0.01)' }}>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
              🎨 Klasik Tablosundaki Renkler
            </h3>
            <div className="mt-2.5 flex flex-col gap-2">
              {CLASSIC_LEGEND.map((entry) => (
                <div
                  key={entry.title}
                  className="flex items-center gap-3 rounded-lg border p-2 text-xs"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.05)', background: 'rgba(255, 255, 255, 0.02)' }}
                >
                  <span className="h-6 w-6 shrink-0 rounded-md shadow-sm" style={{ background: entry.color }} />
                  <div className="flex flex-col">
                    <b className="text-xs text-white">{entry.title}</b>
                    <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                      {entry.desc}
                    </span>
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
                <b className="block text-xs text-white">Sınırsız Mod</b>
                <span className="text-[11px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                  Arka arkaya dilediğin kadar oyna. Sıralama sana özeldir.
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg border p-2" style={{ borderColor: 'rgba(255, 255, 255, 0.05)', background: 'rgba(255, 255, 255, 0.02)' }}>
              <span className="text-base">📅</span>
              <div>
                <b className="block text-xs text-white">Günlük Mod</b>
                <span className="text-[11px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                  Herkese her gün aynı bulmaca verilir. Skorunu arkadaşlarınla kıyasla.
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg border p-2" style={{ borderColor: 'rgba(255, 255, 255, 0.05)', background: 'rgba(255, 255, 255, 0.02)' }}>
              <span className="text-base">⏱️</span>
              <div>
                <b className="block text-xs text-white">Zamana Karşı</b>
                <span className="text-[11px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                  Süre bitmeden kaç doğru yapabilirsin? Takıldığın soruyu "Pas" ile atla.
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {!sub && (
        <section className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
            🕹️ Mini Oyunlar <span className="font-normal normal-case opacity-70">· her birinin Günlük ve Sınırsız&apos;ı var</span>
          </h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {MINI_GAMES.map((game) => (
              <div
                key={game.name}
                className="rounded-xl border p-3.5 transition-all hover:scale-[1.01]"
                style={{ borderColor: 'var(--border)', background: 'rgba(255, 255, 255, 0.015)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{game.icon}</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
                    {game.name}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                  {game.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
          🎚️ Zorluk Seviyeleri Karşılaştırması
        </h3>
        <DifficultyTable />
      </section>
    </>
  )
}

export default function HowTo({ sub, onClose, variant = 'modal', onNavigate }: Props) {
  const isModal = variant === 'modal'
  const dialogRef = useModalFocusTrap<HTMLDivElement>(isModal)

  useEffect(() => {
    if (!isModal) return

    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isModal, onClose])

  const title = (
    <div className="flex items-center gap-2">
      <span className="text-2xl">📖</span>
      <h2 className="font-display text-xl font-bold tracking-wide" style={{ color: 'var(--gold-bright)' }}>
        Nasıl Oynanır Rehberi
      </h2>
    </div>
  )

  if (!isModal) {
    return (
      <div className="relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden" aria-hidden>
          <div
            className="absolute -left-16 top-10 h-44 w-44 rounded-full blur-3xl sm:h-56 sm:w-56"
            style={{ background: 'rgba(var(--hextech-rgb), 0.12)' }}
          />
          <div
            className="absolute right-[-4rem] top-16 h-52 w-52 rounded-full blur-3xl sm:h-64 sm:w-64"
            style={{ background: 'rgba(var(--gold-rgb), 0.1)' }}
          />
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-3 py-3 sm:gap-5 sm:px-4 sm:py-4">
          <section
            className="panel rounded-[1.75rem] border px-4 py-4 sm:px-5 sm:py-5"
            style={{
              background: 'linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.9), rgba(var(--bg-rgb), 0.94))',
              borderColor: 'rgba(var(--gold-rgb), 0.26)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={onClose}
                className="card-btn rounded-full border px-4 py-2 text-sm font-semibold"
                style={{
                  borderColor: 'rgba(var(--gold-rgb), 0.18)',
                  background: 'rgba(var(--bg-rgb), 0.52)',
                  color: 'var(--text-dim)',
                }}
              >
                ← Menü
              </button>
              {title}
              {onNavigate && (
                <div className="w-full min-w-0 sm:ml-auto sm:max-w-md">
                  <GuideTabs active="howto" onSelect={onNavigate} />
                </div>
              )}
            </div>

            <GuideBody sub={sub} />
          </section>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 sm:items-center ovl"
      style={{ background: 'var(--overlay)' }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="anim-pop my-auto w-full max-w-3xl rounded-2xl border p-5 sm:p-6 panel"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Nasıl oynanır"
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          {title}
          <button
            onClick={onClose}
            className="card-btn rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-transform hover:scale-105"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          >
            ✕ Kapat
          </button>
        </div>

        <GuideBody sub={sub} />
      </div>
    </div>
  )
}
