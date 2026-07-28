import { supabase } from './supabase'
import type { CountChallenge } from './counter'

/*
 * "Kaç Tane?" multiplayer taşıma katmanı — Supabase Realtime `channel`.
 *
 * **Veritabanı GEREKMEZ:** broadcast ve presence geçicidir, tabloya yazmaz →
 * kullanıcının Supabase panelinde SQL çalıştırması gerekmiyor (sıralamadan farklı).
 *
 * - Oda = kanal `vt:count:{KOD}`.
 * - **Roster `presence` ile** (kim odada, adı, katılma anı): kopan oyuncu listeden
 *   kendiliğinden düşer.
 * - **Skor `broadcast` ile.** İlk sürümde skor da presence'tan taşınıyordu ve
 *   kullanıcı testinde "çok geç güncelliyor" çıktı: presence bir DURUM DIFF'idir,
 *   sunucuda toplanarak yayılır — roster için doğru, saniyede birkaç kez değişen
 *   skor için yavaş. Broadcast anlık mesajdır. Presence'a skor YİNE yazılıyor ama
 *   yalnız yedek olarak: tur ortasında katılan, kaçırdığı broadcast'lere rağmen
 *   herkesin skorunu görebilsin.
 * - **Tur başlatma `broadcast('start')`** ve yük ölçütün KENDİSİ (label + ids),
 *   indeks DEĞİL: indeks gönderilse iki tarafın şampiyon verisi ayrıştığında
 *   farklı ölçüt görürlerdi (meydan okuma linkindeki `dataVersion` tuzağı).
 */

/**
 * İki presence yazımı arasındaki en kısa süre. Presence sunucuda tüm odaya durum
 * diff'i olarak fan-out edildiği için pahalıdır ve hız sınırına takılır; skor
 * broadcast'le taşındığı için presence'ı sık yazmaya gerek yok.
 */
const PRESENCE_MIN_GAP_MS = 5000

/** Karışan harf/rakamlar (I/1, O/0, S/5) bilerek YOK — kod sesli okunacak */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789'
export const ROOM_CODE_LEN = 4

export function makeRoomCode(): string {
  const buf = new Uint32Array(ROOM_CODE_LEN)
  crypto.getRandomValues(buf)
  return [...buf].map((n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join('')
}

/** Kullanıcının yazdığını koda çevirir: büyük harf + alfabe dışı karakterleri atar */
export function normalizeRoomCode(raw: string): string {
  return [...raw.toUpperCase()].filter((ch) => CODE_ALPHABET.includes(ch)).join('').slice(0, ROOM_CODE_LEN)
}

/**
 * Girişe YAPIŞTIRILAN metinden kodu çıkarır. Gerekçe: arkadaşına gelen mesaj
 * "…odama gel! Kod: Q934" gibi bir CÜMLE olabiliyor; düz `normalizeRoomCode`
 * cümlenin BAŞINDAN dört harf alıp "VADT" gibi çöp üretiyordu (kullanıcı bildirdi).
 * Burada önce tam-uzunlukta geçerli bir kod parçası aranır (sondan başa: kod
 * genelde cümlenin sonunda), bulunamazsa eski davranışa düşülür — böylece
 * harf harf yazma da bozulmaz ("Q9" yazarken hiçbir token 4 hane değildir).
 */
export function parseRoomCode(raw: string): string {
  const tokens = raw.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean)
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i]
    if (t.length === ROOM_CODE_LEN && [...t].every((ch) => CODE_ALPHABET.includes(ch))) return t
  }
  return normalizeRoomCode(raw)
}

export interface RoomPlayer {
  playerId: string
  nick: string
  /** Odaya katılma anı (ms) — host bundan TÜRETİLİR, ayrıca seçilmez */
  joinedAt: number
  score: number
  done: boolean
  /** Tur sonunda "tekrar oynayalım" diyenler — lobide ✓ olarak görünür */
  ready: boolean
  /**
   * Oyuncunun İÇİNDE olduğu turun id'si (lobideyse null). "Herkes bitti mi",
   * "hâlâ oynuyor" ve sonuç listesi YALNIZ aynı turun katılımcılarını sayar —
   * yoksa tur ortasında odaya katılan, hiç oynamadığı hâlde "hâlâ oynuyor"
   * sanılıyor ve sonuç listesine 0'la giriyordu.
   */
  round: string | null
}

/**
 * Oda sahibi: en erken katılan. Host çıkarsa sıradaki kendiliğinden host olur
 * (kimse "host" bayrağı taşımadığı için oda sahipsiz kalmaz).
 * Eşit `joinedAt`'te playerId ile kararlı seçim yapılır.
 */
export function hostOf(players: RoomPlayer[]): RoomPlayer | null {
  if (players.length === 0) return null
  return [...players].sort((a, b) => a.joinedAt - b.joinedAt || a.playerId.localeCompare(b.playerId))[0]
}

/** Sonuç sıralaması: skor yüksekten düşüğe, eşitlikte erken katılan önde (kararlı) */
export function rankPlayers(players: RoomPlayer[]): RoomPlayer[] {
  return [...players].sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt || a.playerId.localeCompare(b.playerId))
}

/**
 * Turu kazananlar: en yüksek (>0) skoru paylaşan HERKES. Tek elemanlıysa net
 * kazanan, birden çoksa beraberlik. Eskiden kazanan `ranked[0] === ben` ile
 * bulunuyordu; eşit skorda sıralama katılma anıyla kırıldığı için aynı skorlu
 * iki oyuncudan biri "kazandın" öteki "tur bitti" görüyordu.
 */
export function winnersOf(players: RoomPlayer[]): RoomPlayer[] {
  const top = players.reduce((m, p) => Math.max(m, p.score), 0)
  if (top <= 0) return []
  return players.filter((p) => p.score === top)
}

/** Turun başlangıç yükü — ölçüt ham olarak taşınır (sürümden bağımsız) */
export interface RoundStart {
  roundId: string
  label: string
  ids: string[]
}

/**
 * İki kaynaktan (anlık broadcast + yedek presence) gelen skoru birleştirir.
 * `max` GÜVENLİ çünkü skor bir tur içinde yalnız ARTAR (monoton): hangi kaynak
 * tazeyse o kazanır, skor asla geri gitmez. Eksik kaynak (`undefined`) tolere edilir.
 */
export function mergeScore(a: number | undefined, b: number | undefined): number {
  return Math.max(a ?? 0, b ?? 0)
}

export type RoomStatus = 'connecting' | 'joined' | 'error'

export interface RoomHandlers {
  onPlayers: (players: RoomPlayer[]) => void
  onStart: (round: RoundStart) => void
  /** Anlık skor (broadcast) — presence'tan hızlı, canlı tablo bunu kullanır */
  onScore: (playerId: string, score: number, done: boolean, round: string | null) => void
  onStatus: (status: RoomStatus) => void
}

export interface RoomHandle {
  /** Yeni tur başlat (yalnız host çağırır — arayüz butonu yalnız ona görünür) */
  start: (challenge: CountChallenge) => void
  /** Kendi skorunu odaya bildir (anlık broadcast + yedek presence). `round` = içinde olduğum tur (lobide null) */
  updateScore: (score: number, done: boolean, round: string | null) => void
  /** "Tekrar oynarım" durumunu odaya bildir */
  setReady: (ready: boolean) => void
  leave: () => void
}

/**
 * Odaya katılır. `supabase` yoksa (env ayarsız) `null` döner — çağıran taraf
 * bunu kullanıcıya açıkça söyler, sessiz boş ekran vermez.
 */
export function joinRoom(
  code: string,
  me: { playerId: string; nick: string },
  h: RoomHandlers,
): RoomHandle | null {
  if (!supabase) return null

  const joinedAt = Date.now()
  let score = 0
  let done = false
  let ready = false
  let round: string | null = null

  const ch = supabase.channel(`vt:count:${code}`, {
    // `broadcast.self: true` ŞART: yoksa host kendi gönderdiği 'start'ı almaz ve
    // tur yalnız ötekilerde başlar. Böylece herkes AYNI kod yolundan geçiyor.
    config: { presence: { key: me.playerId }, broadcast: { self: true } },
  })

  const readPlayers = (): RoomPlayer[] => {
    const state = ch.presenceState<{ nick?: string; joinedAt?: number; score?: number; done?: boolean; ready?: boolean; round?: string | null }>()
    const out: RoomPlayer[] = []
    for (const [playerId, metas] of Object.entries(state)) {
      const m = metas[metas.length - 1] // aynı oyuncu iki sekmede açtıysa en son durumu geçerli
      if (!m) continue
      out.push({
        playerId,
        nick: m.nick || 'Oyuncu',
        joinedAt: m.joinedAt ?? 0,
        score: m.score ?? 0,
        done: m.done ?? false,
        ready: m.ready ?? false,
        round: m.round ?? null,
      })
    }
    return out
  }

  ch.on('presence', { event: 'sync' }, () => h.onPlayers(readPlayers()))
  ch.on('broadcast', { event: 'score' }, ({ payload }) => {
    const p = payload as { playerId?: string; score?: number; done?: boolean; round?: string | null }
    if (typeof p?.playerId === 'string' && typeof p.score === 'number') {
      h.onScore(p.playerId, p.score, !!p.done, p.round ?? null)
    }
  })
  ch.on('broadcast', { event: 'start' }, ({ payload }) => {
    const p = payload as Partial<RoundStart>
    if (typeof p?.roundId === 'string' && typeof p.label === 'string' && Array.isArray(p.ids)) {
      h.onStart({ roundId: p.roundId, label: p.label, ids: p.ids as string[] })
    }
  })

  let lastTrackAt = 0
  const trackSelf = () => {
    lastTrackAt = Date.now()
    void ch.track({ nick: me.nick, joinedAt, score, done, ready, round })
  }

  ch.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      trackSelf()
      h.onStatus('joined')
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      h.onStatus('error')
    }
  })
  h.onStatus('connecting')

  return {
    start: (challenge) => {
      void ch.send({
        type: 'broadcast',
        event: 'start',
        payload: { roundId: `${Date.now()}`, label: challenge.label, ids: challenge.ids } satisfies RoundStart,
      })
    },
    updateScore: (s, d, r) => {
      /*
       * ⚠ Presence ARTIK her skor değişiminde YAZILMIYOR.
       *
       * Eskiden her `updateScore` hem broadcast hem `track()` gönderiyordu; üstüne
       * saniyelik nabız da vardı → istemci başına ~2 mesaj/sn. Presence en pahalı
       * kanaldır (sunucu her değişimde tüm odaya durum diff'i fan-out eder) ve
       * Supabase onu hız sınırına tabi tutar. Kullanıcı testinde tam bu imza çıktı:
       * güncellemeler bir süre geliyor, sonra KESİLİYOR ve rakip "eski turda,
       * hâlâ oynuyor" olarak donup kalıyor (skor gitmiyor, rövanş açılmıyor).
       *
       * Yeni kural: skoru YALNIZ broadcast taşır (ucuz, anlık). Presence yalnız
       * DURUM GEÇİŞLERİNDE (tur değişimi / bitti bayrağı) ve en fazla
       * PRESENCE_MIN_GAP_MS'de bir yazılır — tur ortasında katılan da yaklaşık
       * skoru görsün diye tamamen kapatılmıyor.
       */
      const transition = d !== done || r !== round
      score = s
      done = d
      round = r
      void ch.send({ type: 'broadcast', event: 'score', payload: { playerId: me.playerId, score, done, round } })
      const now = Date.now()
      if (transition || now - lastTrackAt >= PRESENCE_MIN_GAP_MS) trackSelf()
    },
    setReady: (r) => {
      ready = r
      trackSelf()
    },
    leave: () => {
      /*
       * `unsubscribe()` YETMEZ: kanal, paylaşılan `supabase` istemcisinin kanal
       * listesinde KALIR. Her oda kurma/katılma denemesi bir kanal daha bırakınca
       * aynı oturumda tekrar denenen girişlerde realtime bozuluyor (kanal
       * SUBSCRIBED oluyor ama presence boş dönüyor — iki sekmeli testte görüldü).
       * `removeChannel` hem aboneliği kapatır hem listeden düşürür.
       */
      void supabase?.removeChannel(ch)
    },
  }
}
