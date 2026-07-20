/**
 * Ses efektleri — hazır ses DOSYASI kullanmıyoruz.
 * Sesler WebAudio ile anlık üretiliyor: 0 bayt indirme, çevrimdışı çalışır,
 * PWA önbelleğini şişirmez. Karşılığında sesler sade (tek osilatör) —
 * oyun için yeterli, ambiyans müziği istenirse gerçek dosya gerekir.
 */

const SFX_KEY = 'vt:sfx'
const VOLUME_KEY = 'vt:volume' // Replik modundaki ses kaydırıcısıyla ortak

export function sfxEnabled(): boolean {
  return localStorage.getItem(SFX_KEY) !== 'off'
}

export function setSfxEnabled(on: boolean) {
  localStorage.setItem(SFX_KEY, on ? 'on' : 'off')
}

let ctx: AudioContext | null = null

/** AudioContext ilk seste kurulur — sayfa açılışında kurmak tarayıcı politikasına takılıyor */
function audio(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function volume(): number {
  const v = Number(localStorage.getItem(VOLUME_KEY))
  return Number.isFinite(v) && v > 0 ? Math.min(v, 1) : 0.8
}

/** Tek nota — frekans, başlangıç gecikmesi, süre */
function tone(freq: number, delay: number, dur: number, type: OscillatorType = 'sine', gain = 0.18) {
  const ac = audio()
  if (!ac) return
  const t0 = ac.currentTime + delay
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  // Yumuşak iniş: ani kesme "tık" sesi yapıyor
  g.gain.setValueAtTime(gain * volume(), t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + dur)
}

export function playCorrect() {
  if (!sfxEnabled()) return
  tone(523.25, 0, 0.12) // Do
  tone(783.99, 0.09, 0.22) // Sol
}

export function playWrong() {
  if (!sfxEnabled()) return
  tone(180, 0, 0.16, 'sawtooth', 0.1)
}

/** Tur kazanıldı — doğru sesinden ayrışsın diye üç nota */
export function playWin() {
  if (!sfxEnabled()) return
  tone(523.25, 0, 0.12)
  tone(659.25, 0.1, 0.12)
  tone(1046.5, 0.2, 0.3)
}

export function playLose() {
  if (!sfxEnabled()) return
  tone(300, 0, 0.18, 'triangle', 0.14)
  tone(200, 0.15, 0.32, 'triangle', 0.14)
}
