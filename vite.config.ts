import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
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
        // ddragon CDN görselleri: önce önbellek, arka planda tazele
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/ddragon\.leagueoflegends\.com\/cdn\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ddragon-cdn',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
