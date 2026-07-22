import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        /**
         * Paketi değişim hızına göre böl. Tek dosya olduğunda her kod
         * güncellemesinde oyuncular şampiyon/eşya verisini ve React'ı da
         * yeniden indiriyordu; ayrı chunk'lar tarayıcı önbelleğinde kalıyor,
         * güncellemede yalnız gerçekten değişen parça iniyor.
         * (champion-info.json zaten dinamik import ile ayrı chunk.)
         */
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor' // React & co — neredeyse hiç değişmez
          if (id.includes('src/data/champions.json')) return 'data-champions' // patch'te değişir
          if (id.includes('src/data/items.json')) return 'data-items'
          if (id.includes('src/data/emoji.json')) return 'data-emoji'
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt': yeni sürüm push'lanınca (Vercel) servis çalışanı arka planda
      // indirir ama SESSİZCE devreye GİRMEZ — bunun yerine "yeni sürüm hazır"
      // sinyali verir (onNeedRefresh). src/game/pwaUpdate.ts bunu yakalar,
      // Menü'de Ayarlar butonuna baloncuk + Ayarlar'da "Güncelle" bandı gösterir.
      // Kullanıcı tıklayınca uygular. Amaç: arkadaşa "güncelle" demeye gerek kalmasın.
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Vadi Tahmini',
        short_name: 'Vadi Tahmini',
        description: 'Bil bakalım, şampiyon kim? Arkadaşlarınla League of Legends şampiyon tahmin oyunu',
        lang: 'tr',
        theme_color: '#0a0e1a',
        background_color: '#0a0e1a',
        display: 'standalone',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        /**
         * Eski SW sürümlerinin cache'lerini otomatik sil.
         * cdragon-vo (v1) ve cdragon-vo-v2 gibi artık kullanılmayan
         * cache'ler temizlenir — opak yanıt sorunu kökten çözülür.
         */
        cleanupOutdatedCaches: true,
        /**
         * Bilgi kartı verisi (~296 KB) ÖN BELLEĞE ALINMAZ: precache her kurulumda
         * ve her güncellemede indirilir, oysa bu veri yalnız "… hakkında" açılınca
         * gerekiyor. Aşağıdaki runtimeCaching ile ilk açılışta inip kalıcı önbelleğe
         * giriyor. Bedeli: hiç açılmadan çevrimdışı kalınırsa kart yüklenemez —
         * ChampionInfo bu durumu kullanıcıya açıkça söylüyor.
         */
        globIgnores: ['**/champion-info-*.js'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/champion-info-.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'champion-info',
              expiration: { maxEntries: 4 }, // eski sürümler birikmesin
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/ddragon\.leagueoflegends\.com\/cdn\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ddragon-cdn',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          /*
           * Replik modu sesleri (CommunityDragon .ogg) artık SW tarafından
           * ele ALINMIYOR. Neden:
           * - Tarayıcının medya oynatıcısı Range isteği atıyor (206 Partial Content).
           * - Workbox CacheFirst + rangeRequests bu akışı güvenilir şekilde
           *   yönetemiyor: ilk istek 206 dönünce cacheableResponse [200] reddediyor,
           *   opak modda ise gövde okunamıyor.
           * - CDragon zaten `Cache-Control: max-age=3600` gönderiyor; tarayıcının
           *   kendi HTTP önbelleği ses dosyalarını otomatik tutuyor.
           * - Çevrimdışı dinleme kaybediliyor ama Replik modu zaten ağ gerektiriyor.
           */
        ],
        // Eski cdragon-vo runtime cache'lerini temizle — SW aktivasyonunda çalışır
        additionalManifestEntries: [],
      },
      injectManifest: undefined,
    }),
  ],
})
