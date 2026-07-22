<div align="center">

# 🏔️ Vadi Tahmini

**League of Legends Türkçe Tahmin Oyunu**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-Destekli-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel&logoColor=white)](https://vercel.com)

League of Legends şampiyonlarını ve eşyalarını çeşitli ipuçlarıyla tahmin etmeye çalıştığın,  
arkadaşlarınla veya tek başına oynayabileceğin **tamamen Türkçe** web tabanlı tahmin oyunu.

**9 farklı alt mod** · **3 oyun modu** · **4 zorluk seviyesi** · **56 başarım rozeti** · **Küresel sıralama**

[🎮 **Oyna**](https://vadi-tahmini.vercel.app) · [🐛 Hata Bildir](https://github.com/YusufEnesYilmaz/vadi-tahmini/issues)

</div>

---

## 📖 İçindekiler

- [Özellikler](#-özellikler)
- [Oyun Modları](#-oyun-modları)
- [Alt Modlar](#-alt-modlar-ne-tahmin-edilir)
- [Meydan Okuma Sistemi](#-arkadaşına-meydan-oku)
- [Başarım Sistemi](#-başarım-sistemi)
- [Zorluk Seviyeleri](#-zorluk-seviyeleri)
- [Teknik Mimari](#%EF%B8%8F-teknik-mimari)
- [Kurulum](#-kurulum-ve-geliştirme)
- [Veri Güncelleme](#-veri-güncelleme)
- [Proje Yapısı](#-proje-yapısı)
- [Yasal Bilgilendirme](#%EF%B8%8F-yasal-bilgilendirme)

---

## ✨ Özellikler

| | Özellik | Açıklama |
| :---: | :--- | :--- |
| 🌐 | **Tamamen Türkçe** | Arayüz, şampiyon adları, replikler ve tüm içerik Türkçe |
| 📱 | **PWA Desteği** | Telefona yüklenebilir, çevrimdışı çalışabilir |
| 🏆 | **Küresel Sıralama** | Supabase üzerinden canlı liderlik tablosu |
| 🎯 | **9 Farklı Alt Mod** | Klasik, Yetenek, Görsel, Kostüm, Replik, Emoji, Eşya, Silüet, Hikâye |
| ⚔️ | **Meydan Okuma** | Arkadaşlarına özel link ile meydan oku |
| 🎖 | **56 Başarım Rozeti** | Detaylı başarım ve ilerleme sistemi |
| 📅 | **Günlük Bulmaca** | Her gün herkese aynı soru, takvim takibi |
| 📊 | **Detaylı İstatistik** | Mod bazlı kazanma oranları, seriler ve grafikler |
| 🔒 | **Güvenli** | CSP, X-Frame-Options ve modern güvenlik başlıkları |
| ♿ | **4 Zorluk Seviyesi** | Kolay'dan Aşırı Zor'a herkes için uygun |

---

## 🎮 Oyun Modları

<table>
  <tr>
    <th width="140">Mod</th>
    <th width="80">İkon</th>
    <th>Açıklama</th>
  </tr>
  <tr>
    <td><b>Sınırsız</b></td>
    <td align="center">∞</td>
    <td>Bekleme süresi olmadan, arka arkaya istediğin kadar oyna. Pratik yapmak ve yeni modları denemek için ideal.</td>
  </tr>
  <tr>
    <td><b>Günlük</b></td>
    <td align="center">📅</td>
    <td>Herkese her gün <b>aynı ortak sorular</b> sorulur. Sonucunu şık bir emoji tablosuyla arkadaşlarınla paylaşabilirsin. Takvim üzerinden geçmiş günlerdeki performansını takip edebilirsin.</td>
  </tr>
  <tr>
    <td><b>Zamana Karşı</b></td>
    <td align="center">⏱️</td>
    <td><b>60 saniye</b> içinde en fazla doğru tahmini yapmaya çalış. Bitirdiğinde arkadaşlarına meydan okuma linki oluştur.</td>
  </tr>
</table>

---

## 🧩 Alt Modlar (Ne Tahmin Edilir?)

### Şampiyon Modları

| Mod | İkon | Nasıl Oynanır? |
| :--- | :---: | :--- |
| **Klasik** | 🎯 | Şampiyonun özelliklerine *(Cinsiyet, Koridor, Kaynak, Menzil Tipi, Bölge, Çıkış Yılı)* göre tahmin yürüt. Her tahminde hangi özelliklerin eşleştiğini gör. |
| **Yetenek** | ✨ | Yetenek ikonundan şampiyonu bul. Doğru bildikten sonra **"Bu hangi tuş?"** *(Q / W / E / R / Pasif)* bonus sorusu sorulur. |
| **Görsel** | 🖼️ | Kırpılmış Splash Art'tan şampiyonu tahmin et. Yanıldıkça kamera uzaklaşır ve daha fazla alan görünür. |
| **Kostüm** | 🎭 | Görselden şampiyonun hangi kostümü olduğunu bul. |
| **Replik** | 🔊 | Şampiyonun **Türkçe seslendirmesini** dinleyerek kim olduğunu bul. Yanıldıkça yeni replikler açılır: *Yasaklama → Seçilme → Seçim Efekti*. |
| **Emoji** | 😀 | Şampiyona özel seçilmiş emoji ipuçlarından kim olduğunu tahmin et. |
| **Silüet** | 👤 | Karartılmış splash görselden şampiyonu bul. |
| **Hikâye** | 📜 | Şampiyonun biyografisinden / hikâyesinden verilen cümlelerden şampiyonu tahmin et. |

### Diğer Modlar

| Mod | İkon | Nasıl Oynanır? |
| :--- | :---: | :--- |
| **Eşya** | 🗡️ | League of Legends eşyalarını tahmin et. Yanlış bildikçe eşyanın statları, bileşen eşyaları ve ikonu kademeli olarak açılır. |
| **Karışık** | 🎲 | Sınırsız ve Zamana Karşı modlarında her turda **rastgele farklı bir alt modun** sorusu gelir. Her tur bir sürpriz! |

---

## ⚔️ Arkadaşına Meydan Oku

> Tamamen **sunucusuz (serverless)** çalışan, istemci taraflı meydan okuma sistemi.

**Zamana Karşı** modunu bitirdiğinde özel bir meydan okuma linki oluşturulur. Bu link, kriptografik olarak rastgele üretilmiş bir **seed** değeri barındırır (`?c=...` payload).

Arkadaşın bu linkle giriş yaptığında:

1. 🎯 Seninle **birebir aynı soruları**, aynı sıra ile çözer
2. ⏱️ Aynı süre koşullarında yarışır
3. 📊 Süre bittiğinde skorunu **senin skorunla karşılaştırır**

Böylece hiçbir backend sunucusuna gerek kalmadan adil ve tekrarlanabilir bir rekabet deneyimi sunulur.

---

## 🎖 Başarım Sistemi

İstatistiklerden beslenen **36 adet benzersiz başarım rozeti** bulunur. Başarımlar 9 kategoride organize edilmiştir:

| Kategori | Rozet Örnekleri | Açıklama |
| :--- | :--- | :--- |
| 🏅 **Temel** | Çırak, Usta, Efsane | Toplam galibiyet sayısı basamakları |
| 📅 **Günlük Seri** | Alışkanlık, Maraton | Üst üste gün oynama serileri |
| 🎯 **Tahmin Ustalığı** | Keskin Nişancı, Yenilmez | İlk denemede bilme ve galibiyet serileri |
| 🎲 **Çeşitlilik** | — | Farklı modlarda kazanma ve karışık mod rozetleri |
| ⏱️ **Zamana Karşı** | — | Hızlı bilme ve combo rozetleri |
| 💪 **Azim** | — | Toplam oynanan oyun sayısı basamakları |
| 🔥 **Zorluk** | — | Zor ve Aşırı Zor modlardaki zaferler |
| 📚 **Koleksiyon** | — | Kaç farklı şampiyonu doğru bildiğin |
| 👥 **Sosyal** | — | Meydan okuma galibiyetleri |

---

## 🎚 Zorluk Seviyeleri

Sınırsız ve Zamana Karşı modlarında 4 farklı zorluk seviyesi seçilebilir *(Günlük her zaman Normal zorlukta oynanır)*:

| Seviye | Açıklama |
| :--- | :--- |
| 🟢 **Kolay** | Daha fazla ipucu, yeni başlayanlar için |
| 🟡 **Normal** | Standart deneyim |
| 🟠 **Zor** | Daha az ipucu, deneyimli oyuncular için |
| 🔴 **Aşırı Zor** | Minimum ipucu, sadece uzmanlar için |

---

## ⚙️ Teknik Mimari

```
┌──────────────────────────────────────────────────┐
│                   Vercel (CDN)                   │
│            Statik hosting + CSP Headers          │
├──────────────────────────────────────────────────┤
│                                                  │
│   ┌──────────┐  ┌───────────┐  ┌─────────────┐  │
│   │  React   │  │ TypeScript│  │ Tailwind v4 │  │
│   │   v19    │  │   v6.0    │  │ + Vanilla   │  │
│   └────┬─────┘  └─────┬─────┘  └──────┬──────┘  │
│        │              │               │          │
│        └──────────┬───┘───────────────┘          │
│                   │                              │
│            ┌──────┴──────┐                       │
│            │   Vite v8   │                       │
│            │  + PWA      │                       │
│            └──────┬──────┘                       │
│                   │                              │
├───────────────────┼──────────────────────────────┤
│                   │                              │
│   ┌───────────────┴────────────────┐             │
│   │        Veri Kaynakları         │             │
│   ├────────────────────────────────┤             │
│   │  DDragon   → Şampiyon/Eşya    │             │
│   │  CDragon   → Türkçe Replikler │             │
│   │  Meraki    → Detaylı Bilgi    │             │
│   │  Supabase  → Küresel Sıralama │             │
│   └────────────────────────────────┘             │
│                                                  │
│   ┌────────────────────────────────┐             │
│   │      İstemci Depolama          │             │
│   ├────────────────────────────────┤             │
│   │  localStorage → İstatistik,   │             │
│   │    Rozetler, Ayarlar           │             │
│   │  Service Worker → Önbellek    │             │
│   └────────────────────────────────┘             │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Teknoloji Yığını

| Katman | Teknoloji | Açıklama |
| :--- | :--- | :--- |
| **UI Framework** | React 19 | Fonksiyonel bileşenler, hooks mimarisi |
| **Dil** | TypeScript 6.0 | Tam tip güvenliği |
| **Bundler** | Vite 8 | HMR ile hızlı geliştirme |
| **Stil** | Tailwind CSS v4 + Vanilla CSS | Utility-first + özel animasyonlar |
| **PWA** | vite-plugin-pwa | Çevrimdışı destek, yüklenebilirlik |
| **Backend** | Supabase | Küresel sıralama tablosu (anon key) |
| **Lint** | oxlint | Hızlı ve modern linting |
| **Test** | Vitest | Unit testler |
| **Hosting** | Vercel | Otomatik dağıtım, CDN, güvenlik başlıkları |

### Güvenlik

- **Content Security Policy (CSP)** — Yalnızca güvenilir kaynaklardan içerik yüklenir
- **X-Frame-Options: DENY** — Clickjacking koruması
- **X-Content-Type-Options: nosniff** — MIME sniffing koruması
- **Strict Referrer Policy** — Referrer bilgisi koruması
- **Permissions Policy** — Gereksiz tarayıcı API'ları devre dışı

---

## 🚀 Kurulum ve Geliştirme

### Gereksinimler

- [Node.js](https://nodejs.org) v18+
- npm v9+

### Hızlı Başlangıç

```bash
# Repoyu klonla
git clone https://github.com/YusufEnesYilmaz/vadi-tahmini.git
cd vadi-tahmini

# Bağımlılıkları yükle
npm install

# Geliştirici sunucusunu başlat (http://localhost:5173)
npm run dev
```

### Kullanılabilir Komutlar

| Komut | Açıklama |
| :--- | :--- |
| `npm run dev` | Geliştirici sunucusunu başlatır (HMR aktif) |
| `npm run build` | Üretim derlemesi oluşturur |
| `npm run preview` | Üretim derlemesini yerel olarak önizler |
| `npm run lint` | oxlint ile kod kalitesi kontrolü |
| `npm run test` | Vitest ile unit testleri çalıştırır |
| `npm run test:watch` | Testleri izleme modunda çalıştırır |

---

## 🔄 Veri Güncelleme

Yeni League of Legends yaması (patch) geldiğinde şampiyon ve eşya verilerini Riot'un resmi veri havuzundan (DDragon) çekip güncellemek için:

```bash
node scripts/build-data.mjs
```

Bu komut aşağıdaki dosyaları yeniden oluşturur:

| Dosya | İçerik |
| :--- | :--- |
| `src/data/champions.json` | Tüm şampiyon verileri (özellikler, yetenekler, kostümler) |
| `src/data/champion-info.json` | Şampiyon detay bilgileri |
| `src/data/items.json` | Eşya verileri (SR, tam eşyalar) |
| `src/data/emoji.json` | Şampiyonlara atanmış emoji ipuçları |

---

## 📁 Proje Yapısı

```
vadi-tahmini/
├── public/                  # Statik dosyalar (favicon, PWA ikonları)
├── scripts/                 # Veri üretim ve yardımcı scriptler
│   ├── build-data.mjs       #   DDragon'dan veri çekme
│   ├── emoji-review.mjs     #   Emoji eşleştirme inceleme aracı
│   ├── species-review.mjs   #   Tür verisi inceleme aracı
│   └── ...
├── src/
│   ├── components/          # React bileşenleri
│   │   ├── GameScreen.tsx   #   Ana oyun ekranı
│   │   ├── Menu.tsx         #   Ana menü
│   │   ├── Achievements.tsx #   Başarım sistemi
│   │   ├── Leaderboard.tsx  #   Küresel sıralama
│   │   ├── Stats.tsx        #   İstatistikler
│   │   ├── Settings.tsx     #   Ayarlar
│   │   └── ...
│   ├── data/                # Üretilmiş JSON veri dosyaları
│   ├── game/                # Oyun mantığı ve yardımcı modüller
│   │   ├── types.ts         #   Tip tanımlamaları
│   │   ├── achievements.ts  #   Başarım hesaplama
│   │   ├── challenge.ts     #   Meydan okuma sistemi
│   │   ├── puzzle.ts        #   Bulmaca üretimi
│   │   ├── stats.ts         #   İstatistik yönetimi
│   │   ├── difficulty.ts    #   Zorluk sistemi
│   │   ├── rng.ts           #   Deterministik rastgele sayı
│   │   └── ...
│   ├── test/                # Test dosyaları
│   ├── App.tsx              # Kök uygulama bileşeni
│   ├── main.tsx             # Giriş noktası
│   └── index.css            # Global stiller
├── vercel.json              # Vercel yapılandırması (güvenlik başlıkları)
├── vite.config.ts           # Vite + PWA yapılandırması
└── package.json
```

---

## ⚖️ Yasal Bilgilendirme

> **Vadi Tahmini**, Riot Games ile ilişkili değildir ve ticari bir amaç gütmez.  
> Riot Games'in [**Legal Jibber Jabber**](https://www.riotgames.com/en/legal) taraftar içerik politikası kurallarına uygun olarak hazırlanmıştır.  
> League of Legends ve ilgili tüm fikri mülkiyet hakları **Riot Games, Inc.** şirketine aittir.

---

<div align="center">

**Yusuf Enes Yılmaz** tarafından ❤️ ile yapılmıştır.

</div>
