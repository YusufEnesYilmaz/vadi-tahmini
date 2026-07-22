# 🎮 Vadi Tahmini

League of Legends şampiyonlarını ve eşyalarını çeşitli ipuçlarıyla tahmin etmeye çalıştığın, arkadaş gruplarıyla veya tek başına oynanabilen web tabanlı bir tahmin oyunu.

---

## 🏆 Modlar ve Özellikler

### 1. Üst Modlar (Nasıl Oynanır?)

| Üst Mod | Çalışma Mantığı |
| :--- | :--- |
| **Sınırsız** | Bekleme süresi olmadan, arka arkaya istediğin kadar oynayabilirsin. |
| **Günlük** | Herkese her gün 1 kez aynı ortak sorular sorulur. Sonucunu şık bir emoji tablosuyla arkadaşlarınla paylaşabilirsin. |
| **Zamana Karşı** | 60 saniye içinde en fazla doğru tahmini yapmaya çalışırsın. |

---

### 2. Alt Modlar (Ne Tahmin Edilir?)

| Alt Mod | Açıklama |
| :--- | :--- |
| **Klasik** | Şampiyonun özelliklerine (Cinsiyet, Koridor, Kaynak, Menzil Tipi, Bölge, Çıkış Yılı) göre tahmin yürütürsün. |
| **Yetenek** | Yetenek ikonundan şampiyonu bulursun. Doğru bildikten sonra **"Bu hangi tuş?" (Q, W, E, R, Pasif)** şeklinde bonus soru sorulur. |
| **Görsel** | Kırpılmış şampiyon görselinden (Splash Art) tahmin yaparsın. Yanıldıkça görsel uzaklaşır. |
| **Kostüm** | Görselden şampiyonun hangi kostümü olduğunu bulmaya çalışırsın. |
| **Replik** | Şampiyonun Türkçe seslendirmesini dinleyerek kim olduğunu bulursun. Zorluğa göre **Replik 1 (Yasaklama)**, **Replik 2 (Seçilme)** ve **Replik 3 (Seçim Efekti)** sırayla açılır. |
| **Emoji** | Şampiyona özel seçilmiş emoji ipuçlarından kim olduğunu tahmin edersin. |
| **Hikâye** | Şampiyonun biyografisinden / hikâyesinden verilen cümlelerden şampiyonu tahmin edersin. |
| **Eşya** | League of Legends eşyalarını tahmin edersin. Yanlış bildikçe eşyanın statları, bileşen eşyaları ve ikonu açılır. |
| **Karışık Mod** | Sınırsız ve Zamana Karşı modlarında her turda rastgele farklı bir alt modun sorusu gelir. |

---

## ⚔️ Arkadaşına Meydan Oku (Challenge)

Backend sunucusu barındırmayan tamamen statik bir yapıya sahiptir. **Zamana Karşı** modunu bitirdiğinde oluşturulan özel meydan okuma linki (`?c=...` payload'u), kripto rastgele üretilmiş bir **seed** değerini barındırır. 
Arkadaşın bu linkle giriş yaptığında:
* Seninle **birebir aynı soruları** aynı sıra ile çözer.
* Süre bittiğinde skorunu senin skorunla karşılaştırır.

---

## 🎖 Başarım Sistemi (Rozetler)

İstatistiklerden beslenen **36 adet benzersiz başarım rozeti** bulunur. Başarımlar arayüzde 9 kategoriye ayrılmıştır:
* **Temel Başarımlar:** Galibiyet sayıları (Çırak, Usta, Efsane).
* **Günlük Seri:** Üst üste gün oynama serileri (Alışkanlık, Maraton).
* **Tahmin Ustalığı:** Tek seferde bilme ve galibiyet serisi rozetleri (Keskin Nişancı, Yenilmez).
* **Çeşitlilik:** Farklı modları kazanma veya karışık mod rozetleri.
* **Zamana Karşı:** Hızlı bilme ve combo rozetleri.
* **Azim:** Toplam oynanan oyun sayıları.
* **Zorluk:** Zor ve Aşırı Zor modlarda kazanılan zaferler.
* **Koleksiyon:** Kaç farklı şampiyonu bildiğin.
* **Sosyal:** Meydan okuma galibiyetleri.

---

## ⚙️ Teknik Yapı

* **Frontend:** React, TypeScript, Vite.
* **Tasarım / Stil:** Vanilla CSS ve Tailwind CSS v4.
* **PWA:** `vite-plugin-pwa` ile PWA desteği (Çevrimdışı çalışabilirlik, telefona yüklenebilirlik).
* **Önbellek & Update:** Ayarlar sekmesine eklenen **"Yeni Sürümü Denetle & Yükle"** tuşu ile tarayıcıdaki tüm Service Worker ve Cache Storage önbellekleri anında sıfırlanıp en son sürüm indirilebilir (Oyuncu verileri/rozetleri `localStorage` üzerinde korunduğu için asla silinmez).

---

## 🚀 Çalıştırma ve Kurulum

Projeyi yerelde çalıştırmak için:

```bash
# Bağımlılıkları yükle
npm install

# Geliştirici sunucusunu aç (http://localhost:5173)
npm run dev

# Vercel / Canlı ortam için derle
npm run build
```

### Verileri Güncelleme (Yeni Yama / Patch)
Yeni League of Legends yaması geldiğinde şampiyon ve eşya verilerini Riot'un resmi veri havuzundan (DDragon) çekip güncellemek için:

```bash
node scripts/build-data.mjs
```

---

## ⚖️ Yasal Bilgilendirme

Vadi Tahmini, Riot Games ile ilişkili değildir ve ticari bir amaç gütmez. Riot Games'in "Legal Jibber Jabber" taraftar içerik politikası kurallarına uygun olarak hazırlanmıştır. League of Legends ve ilgili tüm fikri mülkiyet hakları Riot Games, Inc. şirketine aittir.
