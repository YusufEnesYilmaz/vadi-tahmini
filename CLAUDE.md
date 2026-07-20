# Vadi Tahmini

Arkadaş grubuyla oynamak için LoLdle tarzı League of Legends tahmin oyunu.
Slogan: "Bil bakalım, şampiyon kim?"
Ticari değil; Riot "Legal Jibber Jabber" fan politikası kapsamında. LoLdle adı kullanılmaz.
Konum: `C:\Users\yusfe\Desktop\Claude\vadi-tahmini`. localStorage önekleri: `vt:`.

## Mimari Özeti

- **Vite + React + TS + Tailwind v4 + vite-plugin-pwa** — saf client-side SPA, backend yok.
- **Menü hiyerarşisi**: üst mod (Sınırsız / Günlük / Zamana Karşı) → alt mod (Klasik / Yetenek / Görsel / Kostüm). 12 kombinasyon.
- Veri: `scripts/build-data.mjs` → `src/data/champions.json` (ddragon tr_TR + Meraki). Görseller repo'da YOK, runtime'da ddragon CDN'den gelir.
- Deploy hedefi: Vercel + PWA. GitHub/Vercel bağlantısını kullanıcı kendisi yapar; **git komutu çalıştırma** (kullanıcının açık isteği).

## Karar Günlüğü

| Tarih | Karar | Gerekçe |
|---|---|---|
| 2026-07-20 | Vite, Next.js değil | SSR/route gereksiz; kullanıcı overengineering istemiyor |
| 2026-07-20 | Rastgelelik: `crypto.getRandomValues` + mod başına deste (Fisher-Yates, localStorage persist, reshuffle'da son≠ilk garantisi) | Kullanıcının açık isteği: iki kişi oyunu açınca aynı şampiyon GELMEMELİ; art arda tekrar da olmamalı. Tek istisna Günlük mod: `fnv1a(tarih+mod)` — bilerek herkese aynı (skor karşılaştırma) |
| 2026-07-20 | Zamana Karşı, Sınırsız ile AYNI desteden çeker | İki modda da tekrar hissi olmasın |
| 2026-07-20 | Bölge+yıl+koridor Meraki'den, cinsiyet script içi statik tablo | ddragon'da yok; Meraki'de gender yok. Yeni şampiyonda Meraki gecikirse `NEW_CHAMP_FALLBACK` devreye girer, rapor uyarır |
| 2026-07-20 | Kroma filtresi: `name.trim().endsWith(')')` | ddragon skins listesinde kromalar parantezli ("(Yakut)") ve splash'ları CDN'de 403; bazı adların sonunda boşluk var, trim şart |
| 2026-07-20 | Skin havuzu skin bazlı deste (~1917), base skin hariç | Kostüm modu şampiyon değil kostüm tahmini |
| 2026-07-20 | Güncelleme: Ayarlar'da 2 katman — SW prompt (`registerType:'prompt'`) + ddragon veri çekme (localStorage'a, gömülü JSON yedek kalır) | Kullanıcının isteği: push'suz güncelleme; yeni şampiyon/kostüm oyuncu tarafından çekilebilsin |
| 2026-07-20 | Classic kolonları: Cinsiyet, Rol, Koridor, Kaynak, Menzil, Bölge, Yıl | Koridor kullanıcı isteğiyle eklendi (LoLdle paritesi) |
| 2026-07-20 | Zorluk karşılaştırma tablosu (`DifficultyTable.tsx`) — menüdeki şeridin altında açılır/kapanır + "Nasıl oynanır" içinde | Kullanıcı "zorlukları anlatan bir yer" istedi. **Satırlar `RULES`'tan türetiliyor, elle yazılmıyor** — `difficulty.ts`'te bir eşik değişince açıklama kendiliğinden güncelleniyor, ikisi çelişemiyor. "yok/açılmaz" değerleri kırmızıya boyanıyor |
| 2026-07-20 | **İstatistik ekranı** (`Stats.tsx`, menüden 📊) | `recordGame`/`recordScore` en baştan veri topluyordu ama tek görünen şey üst çubuktaki "Seri" idi. Üst mod + zorluk sekmeleriyle 18 kombinasyon gezilebiliyor; özet (oynanan / kazanma % / en iyi seri) + mod mod döküm |
| 2026-07-20 | **Günlük panel** (`DailyPanel.tsx`): gece yarısına geri sayım, bugün biten modlar, gün serisi, "Günü paylaş" | Günlük modun tek geri bildirimi "Yarın yeni bulmaca seni bekliyor" cümlesiydi. Gün serisi mod bazlı DEĞİL genel (`vt:dstreak`): üst üste kaç gün oynandığını sayar, gün atlanırsa sıfırlanır. Tarih hesabı öğlen saatinden yapılır ki yaz saati kaymaları günü kaydırmasın |
| 2026-07-20 | Tek paylaşım kartı: günün tüm modları tek metinde | Altı modu ayrı ayrı paylaşmak grup sohbetini boğuyordu |
| 2026-07-20 | Görsel modu artık kostüm splash'larını da kullanıyor (`Puzzle.splashNum`) | Aynı şampiyon tekrar geldiğinde aynı görsel çıkıyordu. **%50 temel görsel ağırlığı var**: bazı kostümler şampiyonu tanınmaz kılıyor (Ay Kızı Diana ≠ Kan Ayı Diana), hepsi kostüm olsa mod adaletsizleşirdi. Günlük'te seçim tarihten türeyen rng ile — herkeste aynı görsel |
| 2026-07-20 | **Zorluk seviyeleri** (Kolay/Normal/Zor/Aşırı Zor) — kullanıcının fikri; "ipuçlarını dengeleme" işiyle birleştirildi | İpucu takvimi zaten zorluğun kendisiydi, iki ayrı iş yapmak yerine tek sistem. Kurallar **`src/game/difficulty.ts`'te TEK KAYNAK** (`RULES`): emoji açılma, zoom, yetenek/kostüm ipucu zamanı, replik 2. klip, klasik yıl oku + kısmi renk, Zamana Karşı süresi. Bileşenler kural okur, kendi eşiklerini tutmaz |
| 2026-07-20 | Günlük'te zorluk YOK (hep normal) | Herkesin aynı bulmacayı aynı ipuçlarıyla çözmesi gerek, yoksa paylaşılan skor anlamsızlaşır |
| 2026-07-20 | Zamana Karşı süresi zorluğa bağlı: 90/60/45/30 sn | Kullanıcı tercihi. Skorlar seviyeler arası kıyaslanamaz hale geliyor, bu yüzden **rekorlar ve istatistikler zorluk başına ayrı anahtarlarda** (`vt:best:{sub}:{diff}`, `vt:stats:{top}:{sub}:{diff}`). Eski anahtarlar terk edildi — yayına çıkmadığı için göç yazılmadı |
| 2026-07-20 | Zorluk seçimi alt mod ekranında şerit; `vt:difficulty`'de hatırlanır | Kullanıcı tercihi (Ayarlar'a gömmek yerine). Oyun içinde değiştirilemiyor — tur ortasında zorluk düşürüp "hile" yapılmasın |
| 2026-07-20 | **Replik modu** (6. alt mod): CommunityDragon'ın **Türkçe** seslendirme kliplerinden şampiyonu bulma | Faz 2'nin ikinci maddesi. Yazılı replik veritabanı yok (ddragon'da da, CDragon'da da) — ama CDragon'da hazır ses var. **Kapsam ölçüldü: 173/173 şampiyon için hem `champion-ban-vo` hem `champion-choose-vo` `tr_tr` altında mevcut** (2026-07-20). Yeni veri dosyası GEREKMEDİ: URL şampiyonun sayısal `key`'inden türüyor |
| 2026-07-20 | Replikte sıra: önce **yasaklanma** klibi, 2 yanlıştan sonra **seçilme** klibi | Seçilme repliği çok tanıdık (çoğu oyuncu ezbere bilir), yasaklanma repliği daha kapalı. Kolay olan ipucu olarak sonraya saklandı |
| 2026-07-20 | Ses klipleri servis çalışanında `CacheFirst` (`cdragon-vo`, `rangeRequests: true`) | ddragon görselleriyle aynı mantık; dinlenen klip tekrar inmesin. `rangeRequests` ses için şart — tarayıcı kısmi istek atıyor |
| 2026-07-20 | **Emoji modu** (5. alt mod): veri `src/data/emoji.json`, şampiyon başına 4–5 emoji, sıra belirsizden belirgine | Faz 2'nin ilk maddesi. ddragon'da böyle bir veri yok, elle yazıldı. Açılma: **ilk emoji açık, her yanlışta bir tane daha** (kullanıcının isteği — başta 2 açıktı, çok kolaydı). Kilitli olanlar `❔` kutusu olarak görünür ki oyuncu kaç ipucu kaldığını bilsin |
| 2026-07-20 | Emoji havuzu yalnızca verisi olan şampiyonlardan çeker (`EMOJI_IDS`) | Yeni şampiyon geldiğinde emojisi yazılana kadar moda girmez — boş ipuçlu, çözülemez bulmaca göstermektense atlamak daha iyi. Locke/Yunara/Zaahen kullanıcıdan alınan tariflerle dolduruldu, artık 173/173 |
| 2026-07-20 | Emoji düzenleme aracı: `node scripts/emoji-review.mjs` → `tools/emoji-review.html` (git'e girmez) | Uygulamaya dev-only ekran gömmek yerine tek seferlik üretilen statik HTML: veri gömülü geldiği için `file://` fetch sorunu yok, kullanıcı düzenleyip "JSON'u indir" ile `src/data/emoji.json`'ı değiştiriyor. Emoji bölme `Intl.Segmenter` ile grafem bazlı — bayrak/ZWJ'li emojiler bozulmuyor |
| 2026-07-20 | Klasik tablosunda "yanlış" rengi kırmızıdan (#7f1d1d) nötr gri-maviye (#3b4455) çekildi; kehribar `--partial` altın temaya yaklaştırıldı; gerçek uyarı için ayrı `--danger` eklendi | Wordle/Wordi referanslarında "yok" nötr gridir — her satırın çoğu hücre yanlış olduğu için kırmızı tablo alarm panosuna dönüyor, doğru/kısmi hücreler seçilemiyordu. Süre sayacı artık `--danger` kullanıyor ki kırmızı gerçekten "dikkat" demeye devam etsin |
| 2026-07-20 | **Nasıl oynanır** penceresi (`HowTo.tsx`) — menüden ve oyun içi "?" butonundan | Wordi referansındaki how-to-play ekranı. Renklerin anlamı (yeşil/kehribar/gri) hiçbir yerde yazmıyordu; arkadaş grubuna link atıldığında ilk soru bu olacaktı. Oyun içinden açılınca sadece o modun anlatımı gösterilir |
| 2026-07-20 | UI cilası: ortak `.card-btn` (hover/active) + `anim-row/pop/shake/pulse` sınıfları `index.css`'te toplandı | Stiller inline `style` ile yazıldığı için hover/focus yazılamıyordu; tek yerde CSS sınıfı olarak durunca bileşenler kalabalıklaşmıyor. `prefers-reduced-motion` ile hepsi kapanıyor, `:focus-visible` altın halka klavye kullanıcısı için |
| 2026-07-20 | Mobilde Classic tablosunun altına "← tabloyu yana kaydır →" ipucu | 375px'te tablo (560px) kaydırılabilir ama görsel bir işaret yoktu; oyuncular Yıl/Bölge kolonlarını görmeden tahmin ediyordu. `sm:hidden` — masaüstünde çıkmaz |
| 2026-07-20 | Ad **"Vadi Tahmini"** (slogan: "Bil bakalım, şampiyon kim?") | Kullanıcı "Bil Bakalım Şampiyon" ile arasında kalmıştı; 12 karakter olduğu için PWA `short_name`'e ve tek satır menü başlığına sığıyor, paylaşım metni de kısa kalıyor — uzun aday slogana çevrildi. "Vadi" = Summoner's Rift, marka adı geçmiyor. Değişen yerler: `index.html`, `vite.config.ts` (manifest), `Menu.tsx`, `Settings.tsx`, `share.ts`, `package.json`, README. Kullanıcının isteğiyle klasör adı da `lol-tahmin` → `vadi-tahmini` ve localStorage öneki `lt:` → `vt:` taşındı; ikon takımı (favicon + PWA) altın "V" tasarımına geçti. Önek değişimi eski kayıtları görünmez kılar — yayına çıkmadan yapıldığı için sadece test verisi etkilendi, göç kodu yazılmadı |
| 2026-07-20 | Classic'ten **Rol kolonu kaldırıldı** (7 kolon: Cinsiyet, Koridor, Kaynak, Menzil, Bölge, Yıl) | Kullanıcı: rol ile koridor çakışıyor, kafa karıştırıyor. Veri katmanında `roles` DURUYOR (`types.ts`, `dataUpdate.ts`, `champions.json`) — geri eklemek istenirse tek yer `ClassicBoard`+`classic.ts`+`share.ts`. Paylaşım grid'i de 6 kareye düştü |
| 2026-07-20 | Yetenek modunda **tuş bonusu**: şampiyon bilinince "Peki bu hangi tuş?" (Pasif/Q/W/E/R, tek hak) | Kullanıcının isteği (LoLdle paritesi). Tuş artık 3 yanlışta ipucu olarak VERİLMEZ — cevabı peşkin verirdi; onun yerine 3 yanlışta yetenek adı açılır. Zamana Karşı'da doğru tuş +1 puan (şampiyon 1 + tuş 1), diğer modlarda sadece gösterilir. Günlük'te seçilen tuş `DailyState.slot`'a yazılır (yenilemede kaybolmasın) ve paylaşım metnine 🟩/🟥 satırı eklenir |

## Komutlar

- `npm run dev` — geliştirme (launch.json: "vadi-tahmini")
- `npm run build` — üretim + PWA
- `node scripts/build-data.mjs` — veriyi yeni patch'e güncelle (rapor basar; cinsiyet tablosuna yeni şampiyon eklemeyi unutma)
- `node scripts/emoji-review.mjs` — emoji düzenleme aracını üretir (`tools/emoji-review.html`); yeni şampiyon geldiğinde emojisini buradan ekle

## Bilinen Sınırlar / Faz 2

- Emoji ve Replik modları YAPILDI (2026-07-20) → 3 üst × 6 alt = 18 kombinasyon.
- **İş listesi (2026-07-20) TAMAMLANDI:** zorluk seviyeleri ✅, istatistik ekranı ✅, günlük mod derinleştirme ✅, görsel modu kostüm havuzu ✅. Hepsi kullanıcı testine hazır.
- **Canlı multiplayer ASKIYA ALINDI (kullanıcı kararı, 2026-07-20):** "ben tekrar konusunu açana kadar". Gerekçe: yeni mod eklemek yerine mevcut özellikleri derinleştirmek isteniyor. Kullanıcı açmadan bu konuyu başlatma.
- **Tuzak (yaşandı, düzeltildi):** olay nesnesinin `currentTarget`'ını `setState` güncelleyicisinin İÇİNDE okuma — güncelleyici sonra çalıştığı için `currentTarget` o an `null` olur ve bileşen komple çöker (beyaz ekran). Değeri handler'ın gövdesinde okuyup güncelleyiciye kapat olarak ver. `QuoteView`'daki `onTimeUpdate` bu yüzden patlamıştı.
- Replik modu kullanıcı tarafından denendi: ses çalıyor, kontroller çalışıyor. Kalan riskli noktalar: (1) otomatik çalma tarayıcı politikasına takılabilir — takılırsa buton zaten var, `failed` durumu uyarı basıyor; (2) bazı yasaklanma replikleri şampiyonun adını söylüyor olabilir, oynayınca görülecek; (3) mod kaçınılmaz olarak sesli — sessiz ortamda oynanamaz, bilinçli kabul.
- Emoji kalitesi tur tur düzeltiliyor (ör. Wukong'un 2. emojisi 🪄 → 🦯 asa). Düzeltme yolu: `node scripts/emoji-review.mjs`.
- localStorage anahtarları `lt:` önekli (deste: `lt:deck:*`, istatistik: `lt:stats:*`, günlük: `lt:daily:*`, veri: `lt:data:updated`).
- Yeni şampiyonlar (Locke, Yunara, Zaahen) Meraki'de yokken elle dolduruldu — Meraki eklenince fallback otomatik devre dışı.

## Güncel Durum (2026-07-20)

**MVP tamam ve doğrulandı.** 3 üst × 4 alt mod çalışıyor; tarayıcıda uçtan uca test edildi:
Classic (koridor kolonu dahil), Yetenek (ipuçları), Görsel (zoom açılımı), Kostüm (TR arama "havali"→"Havalı");
Sınırsız (deste, seri sayacı), Günlük (determinizm node+tarayıcı karşılaştırmasıyla doğrulandı: 2026-07-20 Klasik=Jinx; kalıcılık ve "bugün tamamlandı" rozeti çalışıyor), Zamana Karşı (sayaç, skor, Pas, rekor).
Rastgelelik: iki profil simülasyonunda diziler farklı çıktı. Mobil 375px taşma düzeltildi (`w-full` overflow kabı). Üretim build + PWA (manifest/sw 200, ikonlar `scripts/gen-icons.mjs` ile üretildi) hazır.
Pano kopyalama gömülü test tarayıcısında engellendi (NotAllowedError) — çift fallback eklendi, gerçek tarayıcıda test edilmeli.

**Yetenek tuş bonusu eklendi (kullanıcı tarayıcıda doğruladı).** Dokunulan dosyalar:
`GameScreen.tsx` (`slotGuess` state, `awaitingSlot`, `handleSlot`, tuş butonları + sonuç satırı), `PuzzleView.tsx` (`hideSlot` prop artık kullanılıyor; ipucu sırası değişti), `stats.ts` (`DailyState.slot`), `share.ts` (`shareDailySimple` 4. parametre `slotOk`).

**İlk push'a hazır hale getirildi (2026-07-20 akşam):** ad/ikon/klasör/localStorage öneki taşındı, README baştan yazıldı (Vite şablonu duruyordu), `index.html`'e açıklama + Open Graph etiketleri eklendi (WhatsApp/Discord'da link kartı çıksın diye; `og:image` göreli yol — özel alan adı alınırsa mutlak yapmak gerekebilir). `npm run build` + PWA üretimi temiz, `tsc`/`oxlint` temiz.

**UI cilası (2026-07-20, tarayıcıda doğrulandı):** hover/focus durumları, yeni tahmin satırı ve rozetlerinde giriş animasyonu, yanlış tahminde giriş alanı titremesi, kazanma bandı ve bonus panelinde açılma animasyonu, son 10 saniyede sayaç nabzı, mobilde tablo kaydırma ipucu, iPhone için `safe-area-inset-bottom`. 375px ve masaüstünde ölçüldü: sayfa yatay taşması yok, tablo kendi içinde kayıyor.

**Pinterest turu (2026-07-20):** kullanıcı 4 referans verdi (quiz şablonu, Wordi kelime oyunu, "magic nav menu", Wordle Thanksgiving). Alınanlar: nötr "yanlış" rengi + üst çubuk ayracı (Wordle), how-to-play ekranı + küçük etiket/büyük rakam skor (Wordi), üstten radyal aydınlanmayla derinlik (quiz şablonu). ALINMAYAN: alt navigasyon çubuğu (3 ekranlık uygulamaya gereksiz), çizgi film/rozet süslemeleri (LoL'ün ciddi altın diliyle çakışıyor).

Not: `.claude/launch.json`'da `autoPort: true` var (paralel oturumda 5173 doluydu); Vite PORT env'ini yok sayıp 5174'e düşüyor, tarayıcı panelinde adres elle girilmeli.

Sırada: kullanıcı GitHub repo açıp commit'leyecek + Vercel'e bağlayacak. Faz 2 adayları: Emoji modu, Quote, canlı multiplayer. Masaüstü `.exe` konuşuldu: önce PWA denenecek, gerekirse Tauri sarmalayıcısı (kod değişmez).
