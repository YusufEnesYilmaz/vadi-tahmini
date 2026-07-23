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

/**
 * Ses seviyesi (0–1). Replik modundaki kaydırıcıyla ORTAK anahtar.
 *
 * "Anahtar YOK" ile "0 YAZILMIŞ" ayrılmak ZORUNDA: `getItem` anahtar yokken `null`
 * döner ve `Number(null)` **0**'dır. Tek bir `Number(...) >= 0` kontrolü ikisini
 * aynı sayar → hiç ses ayarı yapmamış oyuncuda seviye 0 çıkar ve TÜM efektler
 * sessizleşir (bir kez yaşandı, kimse sebebini anlamadı). Ham değere önce bakılıyor.
 */
export function getVolume(): number {
  const raw = localStorage.getItem(VOLUME_KEY)
  if (raw === null || raw.trim() === '') return 0.8 // hiç ayarlanmamış
  const v = Number(raw)
  // 0 GEÇERLİ: kullanıcı bilerek sessize almış olabilir, varsayılana döndürme.
  return Number.isFinite(v) && v >= 0 ? Math.min(v, 1) : 0.8
}

export function setVolume(v: number) {
  localStorage.setItem(VOLUME_KEY, String(Math.max(0, Math.min(1, v))))
}

function volume(): number {
  return getVolume()
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

/** Rozet kazanıldığında kısa bir fanfar — playWin'den ayrışsın diye farklı notalar */
export function playAchievement() {
  if (!sfxEnabled()) return
  tone(880, 0, 0.1, 'sine', 0.12)
  tone(1108.73, 0.1, 0.1, 'sine', 0.12)
  tone(1318.51, 0.2, 0.28, 'sine', 0.14)
}

let currentGarenSource: AudioBufferSourceNode | null = null
let garenGainNode: GainNode | null = null

/**
 * Garen MP3'ünü indirip dekode eder (çalarken 0 ms gecikme olsun diye).
 *
 * **Önbelleklenen şey SÖZ (promise), tamponun kendisi değil:** eskiden yalnız
 * bitmiş tampon tutuluyordu, o da ancak `await` bitince yazılıyordu → aynı anda
 * gelen iki çağrı (React StrictMode'un çift efekti, ya da ısıtmayla aynı ana denk
 * gelen bir tıklama) korumayı birlikte geçip dosyayı İKİ KEZ indiriyordu
 * (tarayıcıda ölçüldü: iki 200 yanıtı). Söz paylaşılınca ikinci çağrı bekleyene katılır.
 */
let garenLoad: Promise<AudioBuffer | null> | null = null

function preloadGarenAudio(): Promise<AudioBuffer | null> {
  garenLoad ??= (async () => {
    try {
      const res = await fetch('/sounds/garen_adalet.mp3')
      const arrayBuf = await res.arrayBuffer()
      const ctx = audio()
      if (!ctx) throw new Error('AudioContext yok')
      return await ctx.decodeAudioData(arrayBuf)
    } catch {
      // Başarısız denemeyi ÖNBELLEKLEME: çevrimdışıyken bir kez patlarsa
      // ağ geri geldiğinde tekrar denenebilsin (dosya henüz SW önbeleğinde değil).
      garenLoad = null
      return null
    }
  })()
  return garenLoad
}

/**
 * Klibi ısıt (indir + dekode) — **kullanıcı jestinden SONRA çağrılmalı.**
 * Eskiden bu, modül düzeyinde `setTimeout` ile sayfa açılışında yapılıyordu;
 * o hem yukarıdaki "AudioContext ilk seste kurulur" kuralını deliyor (tarayıcı
 * otomatik oynatma politikası) hem de sesi KAPALI olan oyuncuya bile dosyayı
 * indiriyordu. Şimdi yalnız sesin kullanıldığı ekran (Ayarlar) açılınca çağrılıyor —
 * oraya gelmek zaten bir tıklama gerektirdiği için politika sorunu kalmıyor.
 */
export function warmupGarenAudio() {
  if (!sfxEnabled()) return
  void preloadGarenAudio()
}

/** Garen "ADALET!" sesini WebAudio ile 0ms GECİKMESİZ anında çalar */
export function playGarenUltSound(force = false) {
  if (!sfxEnabled()) return
  const ctx = audio()
  if (!ctx) return

  const vol = getVolume()

  // Ses şu an çalıyorsa ve zorlanmadıysa sadece ses seviyesini anlık güncelle
  if (currentGarenSource && !force) {
    if (garenGainNode) {
      garenGainNode.gain.setValueAtTime(vol, ctx.currentTime)
    }
    return
  }

  void preloadGarenAudio().then((buffer) => {
    if (!buffer) return
    const currentCtx = audio()
    if (!currentCtx) return

    if (currentGarenSource) {
      try {
        currentGarenSource.stop()
      } catch {
        /* yoksay */
      }
    }

    const source = currentCtx.createBufferSource()
    const gain = currentCtx.createGain()

    source.buffer = buffer
    gain.gain.setValueAtTime(vol, currentCtx.currentTime)

    source.connect(gain)
    gain.connect(currentCtx.destination)

    currentGarenSource = source
    garenGainNode = gain

    source.onended = () => {
      if (currentGarenSource === source) {
        currentGarenSource = null
        garenGainNode = null
      }
    }

    source.start(0)
  })
}

/** Çalmakta olan Garen ses klibinin ses yüksekliğini WebAudio ile anlık 0ms gecikmeyle günceller */
export function updateActiveGarenVolume(v: number) {
  const ctx = audio()
  if (ctx && garenGainNode) {
    garenGainNode.gain.setValueAtTime(Math.max(0, Math.min(1, v)), ctx.currentTime)
  }
}
