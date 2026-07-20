import { CHAMPIONS, EMOJI_IDS, byId } from './data'
import { getDeck } from './deck'
import { cryptoRandInt, dailyIndex, fnv1a, seededRng, todayKey } from './rng'
import type { Champion, PlaySub, Skin, SubMode, TopMode } from './types'

/**
 * Karışık modun havuzu: hangi gerçek tipler gelebilir.
 * Zamana Karşı'da Klasik YOK — tablo tabanlı ve uzun sürüyor, süre modunun
 * ritmini öldürüyor (kullanıcı kararı). Sınırsız'da altısı da var.
 */
const MIX_POOL: Record<'endless' | 'timed', SubMode[]> = {
  endless: ['classic', 'ability', 'splash', 'skin', 'emoji', 'quote'],
  timed: ['ability', 'splash', 'skin', 'emoji', 'quote'],
}

export interface Puzzle {
  sub: SubMode
  champion: Champion
  skin?: Skin // skin modunda hedef kostüm
  spellIndex?: number // ability: 0=Pasif, 1..4=Q W E R
  crop?: { x: number; y: number } // splash: odak noktası (%)
  splashNum?: number // splash: hangi kostümün görseli (0 = temel)
}

/** Skin havuzu: "champId:num" anahtarları (kararlı sıra — günlük mod için önemli) */
function skinPool(): string[] {
  const keys: string[] = []
  for (const c of CHAMPIONS) for (const s of c.skins) keys.push(`${c.id}:${s.num}`)
  return keys
}

/**
 * Görsel modu için kostüm seçer. Bazı kostümler şampiyonu tanınmaz hale getirir
 * (Ay Kızı Diana ile Kan Ayı Diana bambaşka), o yüzden temel görsele ağırlık verilir:
 * yarı yarıya temel, yarı yarıya rastgele kostüm.
 */
function pickSplashNum(c: Champion, rand: () => number): number {
  if (rand() < 0.5 || !c.skins.length) return 0
  return c.skins[Math.floor(rand() * c.skins.length)]?.num ?? 0
}

function resolveSkin(key: string): { champion: Champion; skin: Skin } {
  const [id, numStr] = key.split(':')
  const champion = byId(id)!
  const skin = champion.skins.find((s) => s.num === Number(numStr))!
  return { champion, skin }
}

/**
 * Bulmaca üretimi.
 * - endless/timed → deste sistemi (crypto rastgele, kişiye özel; tekrar yok)
 * - daily → tarihten deterministik (herkese aynı)
 * Deste anahtarı alt moda göre: endless ve timed AYNI desteden çeker
 * (plan: "deck:classic" vb.) → iki üst modda da tekrar hissi olmaz.
 */
export function nextPuzzle(top: TopMode, sub: PlaySub): Puzzle {
  // Karışık: izinli havuzdan gerçek bir tip seç, sonra normal yola delege et.
  // Delegasyon sayesinde her tipin kendi destesi çalışır → tip içi tekrarsızlık korunur.
  if (sub === 'mix') {
    const pool = MIX_POOL[top === 'timed' ? 'timed' : 'endless'] // daily+mix menüde yok
    return nextPuzzle(top, pool[cryptoRandInt(pool.length)])
  }

  if (top === 'daily') return dailyPuzzle(sub)

  if (sub === 'skin') {
    const key = getDeck('skin', skinPool()).draw()
    const { champion, skin } = resolveSkin(key)
    // Kostüm de kırpık gösterilir — tamamı görünürse oyun çok kolay
    return { sub, champion, skin, crop: { x: 20 + cryptoRandInt(61), y: 20 + cryptoRandInt(61) } }
  }

  // Emoji modu yalnızca emoji verisi olan şampiyonlardan çeker
  const pool = sub === 'emoji' ? EMOJI_IDS : CHAMPIONS.map((c) => c.id)
  const id = getDeck(sub, pool).draw()
  const champion = byId(id)!
  if (sub === 'ability') {
    return { sub, champion, spellIndex: cryptoRandInt(5) }
  }
  if (sub === 'splash') {
    // Kırpma odağı: kenarlardan uzak dur (%20–80) — genelde karakter ortada
    // Görsel havuzuna kostümler de dahil: aynı şampiyon tekrar gelse bile başka görsel çıkar
    return {
      sub,
      champion,
      splashNum: pickSplashNum(champion, () => cryptoRandInt(1000) / 1000),
      crop: { x: 20 + cryptoRandInt(61), y: 20 + cryptoRandInt(61) },
    }
  }
  return { sub, champion }
}

/**
 * Zamana Karşı için seed'li soru akışı — meydan okumanın temeli.
 *
 * Deste sisteminden (crypto, kişiye özel) AYRI: tur başına tek bir seed'den
 * TÜM rastgelelik (tip seçimi, şampiyon, tuş, kırpma, kostüm) türetilir. Aynı
 * seed'i alan herkes BİREBİR aynı diziyi görür → linkle adil karşılaştırma.
 *
 * Trade-off (bilinçli): tur İÇİNDE tekrar yok (tip başına seed'li deste), ama
 * ardışık TURLAR arası tekrar mümkün (her tur yeni seed). Sınırsız'ın kalıcı
 * deste garantisi bundan etkilenmez — o hâlâ getDeck kullanır.
 */
export interface PuzzleStream {
  next(): Puzzle
}

export function createTimedStream(seed: number, sub: PlaySub): PuzzleStream {
  const rng = seededRng(seed)
  const ri = (max: number) => Math.floor(rng() * max)
  const allIds = CHAMPIONS.map((c) => c.id)
  // Tip başına seed'li deste (lazy): tur içi tekrarı önler, deterministik kalır
  const decks = new Map<string, { order: string[]; pos: number }>()

  function drawFrom(key: string, pool: string[]): string {
    let d = decks.get(key)
    if (!d || d.pos >= d.order.length) {
      const prevLast = d?.order[d.order.length - 1]
      const order = [...pool]
      for (let i = order.length - 1; i > 0; i--) {
        const j = ri(i + 1)
        ;[order[i], order[j]] = [order[j], order[i]]
      }
      // Yeniden karışta baştaki, bir öncekinin sonuyla aynıysa takas et (ardışık tekrar yok)
      if (prevLast && order.length > 1 && order[0] === prevLast) {
        const j = 1 + ri(order.length - 1)
        ;[order[0], order[j]] = [order[j], order[0]]
      }
      d = { order, pos: 0 }
      decks.set(key, d)
    }
    return d.order[d.pos++]
  }

  return {
    next(): Puzzle {
      // Karışıkta gerçek tip de seed'den; değilse doğrudan sub (classic dahil olabilir)
      const realSub: SubMode = sub === 'mix' ? MIX_POOL.timed[ri(MIX_POOL.timed.length)] : (sub as SubMode)

      if (realSub === 'skin') {
        const { champion, skin } = resolveSkin(drawFrom('skin', skinPool()))
        return { sub: 'skin', champion, skin, crop: { x: 20 + ri(61), y: 20 + ri(61) } }
      }
      const pool = realSub === 'emoji' ? EMOJI_IDS : allIds
      const champion = byId(drawFrom(realSub, pool))!
      if (realSub === 'ability') return { sub: 'ability', champion, spellIndex: ri(5) }
      if (realSub === 'splash') {
        return { sub: 'splash', champion, splashNum: pickSplashNum(champion, rng), crop: { x: 20 + ri(61), y: 20 + ri(61) } }
      }
      return { sub: realSub, champion }
    },
  }
}

/**
 * Elle sabitlenen günlük bulmacalar — özel gün / test müdahaleleri.
 * Tarih geçince giriş kendiliğinden etkisizleşir (silinebilir, bırakmak da zararsız).
 * Not: herkesin aynı bulmacayı görmesi güncel kodu çalıştırmasına bağlı —
 * SW güncellemesini henüz almamış oyuncu o günün eski bulmacasını görür.
 */
export const DAILY_OVERRIDES: Record<string, {
  /** Klasik'in cevabını sabitler — şampiyon id'si (ör. "Seraphine") */
  classic?: string
  splash?: { id: string; splashNum: number }
}> = {
  '2026-07-20': {
    classic: 'Seraphine', // test için sabitlendi (kullanıcı isteği)
    splash: { id: 'Garen', splashNum: 1 }, // Kızıl Garen (kullanıcı isteği)
  },
}

function dailyPuzzle(sub: SubMode): Puzzle {
  const rng = seededRng(fnv1a(`${todayKey()}:${sub}:extra`))

  if (sub === 'skin') {
    const pool = skinPool()
    const { champion, skin } = resolveSkin(pool[dailyIndex(sub, pool.length)])
    return { sub, champion, skin, crop: { x: 20 + Math.floor(rng() * 61), y: 20 + Math.floor(rng() * 61) } }
  }

  if (sub === 'emoji') {
    return { sub, champion: byId(EMOJI_IDS[dailyIndex(sub, EMOJI_IDS.length)])! }
  }

  // Klasik elle sabitlenmişse onu kullan; id yanlış yazılmışsa sessizce normale dön
  const ovClassic = sub === 'classic' ? byId(DAILY_OVERRIDES[todayKey()]?.classic ?? '') : undefined
  const champion = ovClassic ?? CHAMPIONS[dailyIndex(sub, CHAMPIONS.length)]
  if (sub === 'ability') {
    return { sub, champion, spellIndex: Math.floor(rng() * 5) }
  }
  if (sub === 'splash') {
    const ov = DAILY_OVERRIDES[todayKey()]?.splash
    return {
      sub,
      champion: ov ? byId(ov.id)! : champion,
      splashNum: ov ? ov.splashNum : pickSplashNum(champion, rng), // tarihten türeyen rng: herkeste aynı görsel
      crop: { x: 20 + Math.floor(rng() * 61), y: 20 + Math.floor(rng() * 61) },
    }
  }
  return { sub, champion }
}
