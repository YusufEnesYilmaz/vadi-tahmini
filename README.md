# Vadi Tahmini

Bil bakalım, şampiyon kim? — Arkadaş grubuyla oynanan League of Legends şampiyon tahmin oyunu.

## Modlar

Üst mod × alt mod olmak üzere 12 kombinasyon:

| Üst mod | Ne yapar |
|---|---|
| **Sınırsız** | Arka arkaya oyna, bekleme yok. Herkesin sırası kendine özel — iki kişiye aynı anda aynı şampiyon gelmez |
| **Günlük** | Herkese aynı bulmaca, günde bir. Sonucu emoji tablosuyla paylaş |
| **Zamana Karşı** | 60 saniyede kaç doğru? Bilemediğini "Pas" ile geç |

| Alt mod | Ne tahmin edilir |
|---|---|
| **Klasik** | İpucu tablosundan şampiyonu bul (cinsiyet, koridor, kaynak, menzil, bölge, yıl) |
| **Yetenek** | Yetenek ikonundan şampiyonu bul — sonra bonus: bu hangi tuş? (Pasif/Q/W/E/R) |
| **Görsel** | Kırpılmış splash art'tan şampiyonu bul, her yanlışta görsel açılır |
| **Kostüm** | Görselden kostümün adını bul |

## Çalıştırma

```bash
npm install
npm run dev      # geliştirme
npm run build    # üretim (PWA dahil)
```

Yeni patch çıktığında şampiyon verisini tazelemek için:

```bash
node scripts/build-data.mjs
```

Oyuncular ayrıca uygulama içinden **Ayarlar > Güncelle** ile veriyi kendileri çekebilir.

## Teknik

Vite + React + TypeScript + Tailwind v4 + PWA. Backend yok, her şey tarayıcıda çalışır;
şampiyon görselleri Riot'un ddragon CDN'inden gelir. Ayrıntılı mimari ve karar günlüğü `CLAUDE.md`'de.

## Yasal

Vadi Tahmini, Riot Games ile ilişkili değildir; ticari bir ürün değildir.
Riot Games'in "Legal Jibber Jabber" fan içerik politikası kapsamında hazırlanmıştır.
League of Legends ve ilgili tüm varlıklar Riot Games, Inc.'e aittir.
