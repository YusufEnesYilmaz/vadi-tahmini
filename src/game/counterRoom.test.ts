import { describe, expect, it } from 'vitest'
import { ROOM_CODE_LEN, hostOf, makeRoomCode, mergeScore, normalizeRoomCode, parseRoomCode, rankPlayers, winnersOf, type RoomPlayer } from './counterRoom'

const p = (playerId: string, joinedAt: number, score = 0, nick = playerId): RoomPlayer =>
  ({ playerId, nick, joinedAt, score, done: false, ready: false, round: null })

describe('counterRoom — oda kodu', () => {
  it('kod doğru uzunlukta ve karışan karakter içermez', () => {
    // I/1, O/0, S/5 sesli okununca karışıyor — alfabede bilerek yok
    for (let i = 0; i < 200; i++) {
      const code = makeRoomCode()
      expect(code).toHaveLength(ROOM_CODE_LEN)
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRTUVWXYZ2346789]+$/)
    }
  })

  it('normalizeRoomCode: küçük harf, boşluk ve çöp temizlenir', () => {
    expect(normalizeRoomCode('a2 b3')).toBe('A2B3')
    expect(normalizeRoomCode('  q7-x9  ')).toBe('Q7X9')
    expect(normalizeRoomCode('zzzzzzzz')).toHaveLength(ROOM_CODE_LEN) // fazlası kırpılır
    expect(normalizeRoomCode('!!!')).toBe('')
  })

  it('normalizeRoomCode alfabe dışı harfleri (I/O/S) atar — üretilen kodda da yoklar', () => {
    expect(normalizeRoomCode('IOS1')).toBe('')
  })

  /*
   * Kullanıcı bildirdi: paylaşılan mesajın tamamı giriş kutusuna yapıştırılınca
   * kod bozuluyordu (cümlenin BAŞINDAN dört harf alınıyordu). parseRoomCode
   * metnin içindeki gerçek kodu bulur; harf harf yazmayı da bozmamalı.
   */
  it('parseRoomCode: yapıştırılan cümlenin içinden kodu çıkarır', () => {
    expect(parseRoomCode('Vadi Tahmini — "Kaç Tane?" odama gel! Kod: Q934')).toBe('Q934')
    expect(parseRoomCode('kod: q934')).toBe('Q934')
    expect(parseRoomCode('  Q934  ')).toBe('Q934')
  })

  it('parseRoomCode: harf harf yazmayı bozmaz', () => {
    expect(parseRoomCode('q')).toBe('Q')
    expect(parseRoomCode('q9')).toBe('Q9')
    expect(parseRoomCode('q93')).toBe('Q93')
    expect(parseRoomCode('q934')).toBe('Q934')
  })
})

describe('counterRoom — host ve sıralama', () => {
  it('host = en erken katılan', () => {
    const players = [p('c', 300), p('a', 100), p('b', 200)]
    expect(hostOf(players)?.playerId).toBe('a')
  })

  it('host: en erken katılan çıkınca sıradaki host olur (oda sahipsiz kalmaz)', () => {
    const players = [p('c', 300), p('b', 200)]
    expect(hostOf(players)?.playerId).toBe('b')
    expect(hostOf([])).toBeNull()
  })

  it('host: eşit joinedAt kararlı (playerId ile) — herkeste AYNI host çıkar', () => {
    const a = [p('b', 100), p('a', 100)]
    const b = [p('a', 100), p('b', 100)]
    expect(hostOf(a)?.playerId).toBe(hostOf(b)?.playerId)
  })

  it('rankPlayers: skor yüksekten düşüğe, eşitlikte erken katılan önde', () => {
    const ranked = rankPlayers([p('a', 100, 3), p('b', 50, 5), p('c', 10, 5)])
    expect(ranked.map((x) => x.playerId)).toEqual(['c', 'b', 'a'])
  })

  it('rankPlayers girdiyi bozmaz (kopya üzerinde çalışır)', () => {
    const input = [p('a', 100, 1), p('b', 50, 9)]
    rankPlayers(input)
    expect(input.map((x) => x.playerId)).toEqual(['a', 'b'])
  })
})

/*
 * Kazanan tespiti: en yüksek (>0) skoru paylaşan HERKES. Beraberlikte iki oyuncu
 * da kazanan sayılmalı — eskiden `ranked[0] === ben` kullanılıyordu ve eşit skorda
 * yalnız erken katılan "kazandın" görüyordu.
 */
describe('counterRoom — winnersOf', () => {
  it('tek kazanan: en yüksek skor', () => {
    const w = winnersOf([p('a', 1, 5), p('b', 2, 3)])
    expect(w.map((x) => x.playerId)).toEqual(['a'])
  })

  it('beraberlik: eşit en yüksek skorlu HERKES kazanan', () => {
    const w = winnersOf([p('a', 1, 5), p('b', 2, 5), p('c', 3, 2)])
    expect(w.map((x) => x.playerId).sort()).toEqual(['a', 'b'])
  })

  it('herkes 0 ise kazanan YOK (kimse "kazandın" görmez)', () => {
    expect(winnersOf([p('a', 1, 0), p('b', 2, 0)])).toEqual([])
    expect(winnersOf([])).toEqual([])
  })
})

/*
 * Skor iki kanaldan geliyor: anlık broadcast + yedek presence. Presence geç
 * geldiği için ikisi bir süre farklı olur; birleştirme kuralı skorun GERİ
 * GİTMEMESİNİ garanti etmeli (tur içinde skor yalnız artar).
 */
describe('counterRoom — skor birleştirme', () => {
  it('taze olan kazanır, eksik kaynak tolere edilir', () => {
    expect(mergeScore(5, 3)).toBe(5) // broadcast önde
    expect(mergeScore(3, 5)).toBe(5) // presence önde (broadcast kaçmış)
    expect(mergeScore(undefined, 4)).toBe(4)
    expect(mergeScore(4, undefined)).toBe(4)
    expect(mergeScore(undefined, undefined)).toBe(0)
  })

  it('skor geri gitmez: geç gelen düşük değer görüneni bozmaz', () => {
    let shown = 0
    for (const [bc, pres] of [[1, 0], [2, 0], [2, 1], [3, 1], [3, 2]] as const) {
      const next = mergeScore(bc, pres)
      expect(next).toBeGreaterThanOrEqual(shown)
      shown = next
    }
    expect(shown).toBe(3)
  })
})
