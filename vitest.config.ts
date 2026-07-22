import { defineConfig } from 'vitest/config'

/**
 * Testler tarayıcı gerektirmiyor: sınanan şey oyun mantığı (deste, rastgelelik,
 * zorluk kuralları, istatistik). Tarayıcı ortamı yerine localStorage'ı
 * setup dosyasında taklit ediyoruz — jsdom bağımlılığı gereksiz ağırlık olurdu.
 */
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts'],
  },
})
