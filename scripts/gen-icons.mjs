// PWA ikonları: bağımlılıksız, saf Node ile PNG üretir
// Tasarım: koyu yuvarlak kare + altın "V" (Vadi) + tepe noktasında açık renk hedef noktası
// favicon.svg ile aynı biçim — biri değişirse diğerini de güncelle
// Çalıştır: node scripts/gen-icons.mjs
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const PUB = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

// Renkler (index.css ile aynı tema)
const BG = [10, 14, 26] // --bg
const GOLD = [200, 170, 110] // --gold
const BRIGHT = [240, 230, 210] // --gold-bright

/** Noktanın [a,b] doğru parçasına uzaklığı (yuvarlak uçlu çizgi için) */
function distToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay
  const len2 = vx * vx + vy * vy
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len2))
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy))
}

/** Kenar yumuşatma: uzaklığı 0–1 kapsama oranına çevirir */
function coverage(d, radius) {
  return Math.max(0, Math.min(1, radius + 0.5 - d))
}

function makePng(size) {
  const px = Buffer.alloc(size * size * 4)
  const c = size / 2
  const corner = size * 0.18 // yuvarlak köşe yarıçapı

  // "V" — favicon.svg'deki 64'lük koordinatların oranlanmış hali
  const vx1 = size * 0.281, vy1 = size * 0.266 // sol üst uç
  const vxm = size * 0.5, vym = size * 0.703 // alt tepe
  const vx2 = size * 0.719, vy2 = size * 0.266 // sağ üst uç
  const stroke = size * 0.055 // çizgi yarı kalınlığı
  const rDot = size * 0.07

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      // Yuvarlak köşeli kare maske
      const dx = Math.max(Math.abs(x - c) - (c - corner), 0)
      const dy = Math.max(Math.abs(y - c) - (c - corner), 0)
      if (dx * dx + dy * dy > corner * corner) {
        px[i + 3] = 0 // şeffaf
        continue
      }

      // Zemin → altın V → açık nokta sırasıyla harmanla
      let col = [...BG]
      const dV = Math.min(
        distToSegment(x, y, vx1, vy1, vxm, vym),
        distToSegment(x, y, vxm, vym, vx2, vy2),
      )
      const aGold = coverage(dV, stroke)
      if (aGold > 0) col = col.map((ch, k) => ch + (GOLD[k] - ch) * aGold)
      const aDot = coverage(Math.hypot(x - vxm, y - vym), rDot)
      if (aDot > 0) col = col.map((ch, k) => ch + (BRIGHT[k] - ch) * aDot)

      px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]; px[i + 3] = 255
    }
  }

  // PNG kodlama (filter 0 satırları + zlib)
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const idat = deflateSync(raw)

  function chunk(type, data) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type), data])
    const crcTable = []
    for (let n = 0; n < 256; n++) {
      let cVal = n
      for (let k = 0; k < 8; k++) cVal = cVal & 1 ? 0xedb88320 ^ (cVal >>> 1) : cVal >>> 1
      crcTable[n] = cVal
    }
    let crc = 0xffffffff
    for (const b of body) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8)
    const crcBuf = Buffer.alloc(4)
    crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0)
    return Buffer.concat([len, body, crcBuf])
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  const path = join(PUB, `pwa-${size}.png`)
  writeFileSync(path, makePng(size))
  console.log(`✓ ${path}`)
}
