import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const swPath = path.resolve(__dirname, '../dist/sw.js')

if (fs.existsSync(swPath)) {
  let code = fs.readFileSync(swPath, 'utf8')
  if (!code.includes('cdragon-vo')) {
    const cleanup = `\nself.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(n=>Promise.all(n.filter(c=>c.startsWith("cdragon-vo")).map(c=>caches.delete(c)))))});`
    fs.writeFileSync(swPath, code + cleanup)
    console.log('✅ Service worker updated with old cache cleanup code.')
  } else {
    console.log('ℹ️ Service worker already has old cache cleanup code.')
  }
} else {
  console.error('❌ Service worker file not found at:', swPath)
  process.exit(1)
}
