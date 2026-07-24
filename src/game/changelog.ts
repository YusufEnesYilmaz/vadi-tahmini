/*
 * "Yenilikler" (changelog) — TEK KAYNAK.
 *
 * Girdiler ELLE yazılır (otomatik türetme yok) ve OYUNCU DİLİYLE anlatılır —
 * "presence yerine broadcast" değil, "skorlar artık anında görünüyor".
 * En yeni girdi EN ÜSTTE durur; testler id benzersizliğini ve tarih sırasını korur.
 *
 * "Görülmemiş yenilik var mı" tespiti SÜRÜM numarasına değil, en üstteki girdinin
 * id'sine bağlıdır: her deploy yeni bir changelog girdisi demek değildir — girdi
 * yazılmadıysa menüde bant çıkmaz. Yeni bir özellik eklediğinde buraya girdi
 * eklemek iyi pratik; bant ancak öyle yanar.
 */

export interface ChangelogItem {
  /** Satırın solunda rozette gösterilen emoji */
  icon: string
  text: string
}

export interface ChangelogEntry {
  /** Benzersiz, kalıcı kimlik (görüldü takibi buna bağlı) — kebab-case */
  id: string
  /** YYYY-MM-DD */
  date: string
  title: string
  /** Oyuncu diliyle madde listesi */
  items: ChangelogItem[]
}

/** En yeni EN ÜSTTE */
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: 'mini-oyun-rozetleri',
    date: '2026-07-24',
    title: 'Yeni mini oyunlara 8 rozet',
    items: [
      { icon: '🎖️', text: 'Zaman Tüneli, Şampiyon Avı, Dokuz Kare ve Bağlantılar artık rozet kazandırıyor — her modda bir "ilk galibiyet" + bir ustalık rozeti (toplam 8 yeni).' },
      { icon: '🧠', text: 'Ustalık rozetleri kolay değil: sırayı İLK denemede bul, avı en fazla 4 tahminde bitir, Dokuz Kare\'yi ve Bağlantılar\'ı hiç yanlışsız çöz.' },
    ],
  },
  {
    id: 'uc-yeni-mini-oyun',
    date: '2026-07-24',
    title: '3 yeni mini oyun daha: Av · Dokuz Kare · Bağlantılar',
    items: [
      { icon: '🏹', text: 'Şampiyon Avı: gizli şampiyonu alfabetik mesafe ipuçlarıyla 8 denemede bul. Her tahmin hedefin kaç sıra uzakta ve hangi yönde olduğunu söyler; A-Z şeridi daralan aralığı gösterir.' },
      { icon: '🔲', text: 'Dokuz Kare: 3×3 ızgarada her hücre, satır VE sütun kriterini birden sağlayan bir şampiyon ister — her şampiyon yalnız bir kez kullanılabilir. Süre yok, düşün taşın.' },
      { icon: '🧩', text: 'Bağlantılar: 16 şampiyonun içinde ortak özelliği paylaşan 4 gizli grup var. 4 seç, onayla — ama dikkat, bazı şampiyonlar birden çok gruba uyar gibi görünür!' },
      { icon: '📅', text: 'Üçünün de Günlük (herkese aynı bulmaca) ve Sınırsız modu var; Av ile Bağlantılar\'da Sınırsız\'a özel zorluk seçenekleri de cabası.' },
    ],
  },
  {
    id: 'zaman-tuneli-modu',
    date: '2026-07-24',
    title: 'Yeni Mini Oyun: Zaman Tüneli 🕰️',
    items: [
      { icon: '🕰️', text: '4 yeni mini oyun paketinin ilk modu geldi: Zaman Tüneli! 5 şampiyonu çıkış yılına göre eskiden yeniye sırala.' },
      { icon: '🔒', text: '▲ ve ▼ oklarıyla yer değiştir, sırayı onayla — doğru bilinen pozisyonlar yeşile kilitlenir!' },
      { icon: '📅', text: 'Hem Günlük (tüm oyunculara aynı 5 şampiyon) hem de Sınırsız mod ile istediğin kadar oyna.' },
    ],
  },
  {
    id: 'meydan-okuma-multiye-tasindi',
    date: '2026-07-24',
    title: "Meydan okuma artık Multi'de",
    items: [
      { icon: '⚔️', text: 'Eski link tabanlı meydan okuma emekli oldu — yerini Kaç Tane? multiplayer odaları aldı. Eski meydan okuma linkleri artık oyun açmıyor.' },
      { icon: '🏆', text: 'Meydan okuma rozetleri (Meydan Okuyucu, Rakip, Gladyatör, Şampiyon) artık Kaç Tane? Multi turu kazanınca ilerliyor. Kazandığın rozetler ve eski galibiyetlerin aynen duruyor.' },
      { icon: '📝', text: 'Zamana Karşı sonunda takma adın yoksa skoru sıralamaya yazdırmak için adın soruluyor — skorun sessizce kaybolmuyor.' },
    ],
  },
  {
    id: 'kac-tane-multi',
    date: '2026-07-24',
    title: 'Kaç Tane? artık MULTIPLAYER',
    items: [
      { icon: '👥', text: 'Kaç Tane? moduna gerçek zamanlı oda geldi: oda kur, 4 haneli kodu arkadaşlarına at, 2-8 kişi aynı ölçütü aynı anda oynayın. Skorlar canlı akıyor, tur sonunda sıralama + "tekrar oynayalım mı?" oylaması var.' },
      { icon: '⏱', text: 'Kaç Tane? kuralları oturdu: ölçütler sade (tek koşul — "Zaun", "Yordle" gibi), öneri listesi açık, yanlış denemeler altta kırmızıda birikiyor. Ama dikkat: üst üste 5 yanlış süreden 10 saniye yakar!' },
      { icon: '🎖️', text: 'Menüdeki unvan rozetinde artık GERÇEK LoL lig amblemleri var (Demir → Şampiyon). Amblemler eskisinden çok daha büyük ve net.' },
      { icon: '🕳️', text: 'Kassadin, Kai\'Sa ve Malzahar artık "Boşluk" türünde sayılıyor (Klasik tablo, Bingo ve Kaç Tane? buna göre güncellendi).' },
      { icon: '🖥️', text: 'Masaüstünde arayüz genişledi: ana menü iki kolon, multi\'de skor tablosu sağda sabit, oyun ekranı daha ferah.' },
      { icon: '🚪', text: 'Kaç Tane?\'de yanlışlıkla çıkışa karşı onay soruluyor (tek kişilikte ilk tahminden sonra).' },
    ],
  },
]

const SEEN_KEY = 'vt:changelog:seen'

export function latestChangelogId(): string {
  return CHANGELOG[0]?.id ?? ''
}

/** Menüdeki "🆕 neler var?" bandı bunu okur — yeni girdi yazılmadıysa yanmaz */
export function hasUnseenChangelog(): boolean {
  try {
    return latestChangelogId() !== '' && localStorage.getItem(SEEN_KEY) !== latestChangelogId()
  } catch {
    return false
  }
}

export function markChangelogSeen() {
  try {
    localStorage.setItem(SEEN_KEY, latestChangelogId())
  } catch { /* önemsiz */ }
}
