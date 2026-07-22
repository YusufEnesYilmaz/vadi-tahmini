/**
 * Paylaşım kartı — sonucu PNG olarak çizer.
 *
 * Neden canvas: WhatsApp/Discord'da düz metin emoji ızgarası cihazdan cihaza
 * kayıyor (emoji genişlikleri farklı, tek boşluk her şeyi bozuyor). Görsel her
 * yerde aynı görünür. Harici kütüphane YOK — canvas tarayıcıda hazır.
 */

const W = 900
const PAD = 56

const COLORS = {
  bg: '#0a0e1a',
  card: '#111827',
  border: '#2a3648',
  gold: '#c8aa6e',
  goldBright: '#f0e6d2',
  text: '#e5e7eb',
  dim: '#9ca3af',
  correct: '#16a34a',
  partial: '#b8912f',
  wrong: '#3b4455',
}

export interface CardData {
  title: string // "Vadi Tahmini"
  subtitle: string // "Günlük Klasik · 2026-07-20"
  headline: string // "3 denemede bildim!"
  /** Klasik için renk ızgarası: her satır hücre sonuçları */
  grid?: ('correct' | 'partial' | 'wrong')[][]
  /** Diğer modlar için serbest satırlar ("🎯 Klasik: 3 deneme") */
  lines?: string[]
  footer: string
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

/** Kartı çizer ve PNG blob döner (başarısızsa null) */
export async function renderCard(data: CardData): Promise<Blob | null> {
  const rows = data.grid?.length ?? 0
  const lines = data.lines?.length ?? 0
  const bodyH = rows * 74 + lines * 46
  const H = 300 + bodyH

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const c = canvas.getContext('2d')
  if (!c) return null

  // Zemin + üstten aydınlanma (uygulamadaki radyal ile aynı fikir)
  c.fillStyle = COLORS.bg
  c.fillRect(0, 0, W, H)
  const glow = c.createRadialGradient(W / 2, -80, 0, W / 2, -80, W)
  glow.addColorStop(0, '#141c33')
  glow.addColorStop(1, COLORS.bg)
  c.fillStyle = glow
  c.fillRect(0, 0, W, H)

  // Başlık — uygulamadaki serif başlık diliyle aynı
  c.fillStyle = COLORS.goldBright
  c.font = 'bold 52px Georgia, serif'
  c.fillText(data.title, PAD, 96)

  c.fillStyle = COLORS.gold
  c.font = '26px system-ui, sans-serif'
  c.fillText(data.subtitle, PAD, 138)

  c.fillStyle = COLORS.text
  c.font = 'bold 34px system-ui, sans-serif'
  c.fillText(data.headline, PAD, 200)

  // Gövde: ya renk ızgarası ya satırlar
  let y = 250
  if (data.grid?.length) {
    const cell = 58
    const gap = 10
    for (const row of data.grid) {
      let x = PAD
      for (const r of row) {
        c.fillStyle = r === 'correct' ? COLORS.correct : r === 'partial' ? COLORS.partial : COLORS.wrong
        roundRect(c, x, y, cell, cell, 12)
        c.fill()
        x += cell + gap
      }
      y += cell + gap + 6
    }
  }
  if (data.lines?.length) {
    c.font = '28px system-ui, sans-serif'
    for (const line of data.lines) {
      c.fillStyle = COLORS.text
      c.fillText(line, PAD, y + 30)
      y += 46
    }
  }

  // Alt bilgi
  c.strokeStyle = COLORS.border
  c.lineWidth = 2
  c.beginPath()
  c.moveTo(PAD, H - 78)
  c.lineTo(W - PAD, H - 78)
  c.stroke()

  c.fillStyle = COLORS.dim
  c.font = '22px system-ui, sans-serif'
  c.fillText(data.footer, PAD, H - 36)

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}

/**
 * Kartı paylaş: destekleyen cihazda sistem paylaşım penceresi (WhatsApp/Discord
 * doğrudan çıkar), desteklemeyende dosya indirilir.
 * Dönen değer kullanıcıya ne olduğunu söylemek için.
 */
export async function shareCard(data: CardData, fileName: string): Promise<'shared' | 'downloaded' | 'failed'> {
  const blob = await renderCard(data)
  if (!blob) return 'failed'
  const file = new File([blob], fileName, { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: data.title })
      return 'shared'
    } catch {
      return 'failed' // kullanıcı vazgeçti ya da paylaşım engellendi
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
