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
      registerType: 'prompt', // güncelleme kullanıcıya sorulur (Ayarlar > Güncelle)
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
          {
            // Replik modu sesleri (CommunityDragon) — dinlenen klip bir daha inmesin
            urlPattern: /^https:\/\/raw\.communitydragon\.org\/.*\.ogg$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdragon-vo',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true, // ses için kısmi istek desteği
            },
          },
        ],
      },
    }),
  ],
})
