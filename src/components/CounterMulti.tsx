import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  COUNT_SECONDS, PENALTY_SECONDS, WRONG_STREAK_PENALTY,
  isInChallenge, randomChallenge, type CountChallenge,
} from '../game/counter'
import {
  ROOM_CODE_LEN, hostOf, joinRoom, makeRoomCode, mergeScore, parseRoomCode, rankPlayers, winnersOf,
  type RoomHandle, type RoomPlayer, type RoomStatus,
} from '../game/counterRoom'
import { byId, squareUrl } from '../game/data'
import { getNick, getPlayerId, recordChallengeWin, setNick } from '../game/challenge'
import { evaluateAchievements } from '../game/achievements'
import { isLeaderboardEnabled } from '../game/supabase'
import { playCorrect, playLose, playWin, playWrong } from '../game/sfx'
import { copyToClipboard } from '../game/share'
import CounterBoard from './CounterBoard'
import ExitConfirm from './ExitConfirm'

/** Tur sonunda "tekrar oynayalım mı?" sorusunun cevapsız kalma süresi */
const REMATCH_SECONDS = 15

/**
 * "Katıl" sonrası odada BAŞKASI görünmesi için tanınan süre. Realtime kanalları
 * efemer olduğu için "bu oda var mı" diye sorulamıyor; varlık kanıtı = odada başka
 * birinin belirmesi. Ölçüm: presence normalde 266–886 ms'de geliyor, o yüzden 6 sn
 * bol pay bırakıyor (eski 2 sn tek atışlık kontrol var olan odaları eliyordu).
 */
const JOIN_PROBE_MS = 6000

interface Props {
  onExit: () => void
}

/**
 * "Kaç Tane?" MULTIPLAYER — gerçek zamanlı oda (Supabase Realtime).
 *
 * Kurallar (kullanıcı kararı): oda kodu paylaşılır, 2–8 kişi, herkes AYNI ölçütü
 * aynı anda oynar ve **herkes kendi listesini doldurur** (aynı şampiyonu iki
 * oyuncu da sayabilir — çalma yok). Tek kişilikteki ceza kuralı aynen geçerli:
 * art arda {WRONG_STREAK_PENALTY} yanlış süreden {PENALTY_SECONDS} sn yakar.
 *
 * Ölçüt host tarafından HAM gönderilir (label + ids) — bkz. counterRoom.ts.
 */
export default function CounterMulti({ onExit }: Props) {
  const playerId = useMemo(() => getPlayerId(), [])
  const [nick, setNickState] = useState(getNick)
  const [codeInput, setCodeInput] = useState('')
  const [room, setRoom] = useState<string | null>(null) // katıldığımız oda kodu
  const [status, setStatus] = useState<RoomStatus>('connecting')
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [copied, setCopied] = useState(false)
  const [notFound, setNotFound] = useState(false) // "Katıl" denen kodda kimse yoktu
  const [confirmExit, setConfirmExit] = useState(false)
  /** Tur sonu "tekrar oyna?" geri sayımı — null = soru sorulmuyor */
  const [rematchLeft, setRematchLeft] = useState<number | null>(null)
  /** Anlık skorlar (broadcast) — presence'tan hızlı; her yeni turda sıfırlanır */
  const [liveScores, setLiveScores] = useState<Record<string, { score: number; done: boolean; round: string | null }>>({})
  /** onStart kapanışının güncel turu görebilmesi için (state closure'da bayat kalır) */
  const roundIdRef = useRef<string | null>(null)
  /** Son oynanan ölçüt — lobiden başlatılan tur da aynı ölçütü TEKRAR vermesin */
  const lastLabelRef = useRef<string | undefined>(undefined)
  /** BİTİRDİĞİM turun id'si — rakibin o tura ait bayat kaydı yeni turu kilitlemesin */
  const finishedRoundRef = useRef<string | null>(null)
  /** Kapanış anında dondurulan sonuç sıralaması */
  const [finalRanking, setFinalRanking] = useState<RoomPlayer[] | null>(null)

  // Tur durumu
  const [challenge, setChallenge] = useState<CountChallenge | null>(null)
  const [roundId, setRoundId] = useState<string | null>(null)
  const [found, setFound] = useState<string[]>([])
  const [wrong, setWrong] = useState<string[]>([])
  const [wrongStreak, setWrongStreak] = useState(0)
  const [penalty, setPenalty] = useState(false)
  const [over, setOver] = useState(false)
  const [shake, setShake] = useState(false)
  /** Güvenlik supabı: tur başlangıcından COUNT_SECONDS+3 sn sonra tur ZORLA kapanır */
  const [roundDeadline, setRoundDeadline] = useState(false)

  /*
   * Süre DUVAR SAATİNDEN türetilir, tık tık azaltılmaz. Eski `setInterval`li
   * azaltmada tarayıcı arka plan sekmesinin zamanlayıcısını kısınca süre fiilen
   * DONUYORDU — sekmeden ayrılan oyuncu rakipleri oynarken bedava süre kazanıyordu.
   * Şimdi: left = COUNT_SECONDS − geçen − cezaToplamı; sekmeye dönüşte ilk tikte
   * değer doğruya oturur, süreyi durdurmak imkânsız.
   */
  const startAtRef = useRef(0)
  const [nowTick, setNowTick] = useState(0)
  const [penaltySec, setPenaltySec] = useState(0)

  const handleRef = useRef<RoomHandle | null>(null)
  /** "Katıl" sonrası oda-var-mı yoklaması — ekrandan çıkınca durdurulur */
  const joinProbeRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const total = challenge?.ids.length ?? 0
  const allFound = !!challenge && total > 0 && found.length === total
  /** KİŞİSEL bitiş — ceza yüzünden herkesinki farklı ana düşebilir */
  const finished = over || allFound
  const inRound = !!challenge && !finished

  const elapsed = challenge ? Math.floor((Math.max(nowTick, startAtRef.current) - startAtRef.current) / 1000) : 0
  const left = Math.max(0, COUNT_SECONDS - elapsed - penaltySec)

  /*
   * Canlı skor tablosu.
   * - **KENDİ skorum ağdan OKUNMAZ**, doğrudan yerel state'ten gelir. İlk sürümde
   *   kendi satırım da broadcast/presence'tan besleniyordu ve iki tarayıcı testinde
   *   bayat kaldı (ekranda 9/9 bulmuşken tabloda 4 yazıyordu): kendi mesajının
   *   sunucudan geri dönmesini beklemek hem yavaş hem gereksiz — bilgi zaten elimde.
   * - Ötekiler için anlık broadcast ile yedek presence `mergeScore` ile birleşir.
   */
  const view = useMemo(
    () => players.map((p) => (p.playerId === playerId
      ? { ...p, score: found.length, done: finished }
      : {
          ...p,
          score: mergeScore(liveScores[p.playerId]?.score, p.score),
          done: (liveScores[p.playerId]?.done ?? false) || p.done,
          // Turu broadcast daha taze bilir; presence yedek (bkz. skor kararı)
          round: liveScores[p.playerId] !== undefined ? liveScores[p.playerId].round : p.round,
        })),
    [players, liveScores, playerId, found.length, finished],
  )
  const host = hostOf(players)
  const isHost = !!host && host.playerId === playerId

  /*
   * Tur, HERKES bitince kapanır — kişisel bitişte değil (kullanıcı bildirdi:
   * ceza yüzünden erken biten, diğerleri oynarken sonucu görüp lobiye dönüyordu).
   * `roundDeadline` kilitlenmeyi önler: tur ortasında katılan oyuncu hiç oynamaz
   * ve done'ı hep false kalır — süre üst sınırı geçince onu beklemeyi bırakırız
   * (ceza süreyi yalnız KISALTIR, kimse COUNT_SECONDS'tan uzun oynayamaz).
   * Odadan çıkan presence'tan düşer → othersDone kendiliğinden yeniden hesaplanır.
   */
  /*
   * Yalnız BU TURUN katılımcıları sayılır (`p.round === roundId`): tur ortasında
   * odaya katılan oynamıyor — onu "hâlâ oynuyor" göstermek, bitişini beklemek ya da
   * sonuç listesine 0'la koymak yanlıştı. Kendi `round`'um yerel state'ten gelir
   * (kendi satırı ağdan okumama kuralının aynısı).
   */
  const myView = view.map((p) => (p.playerId === playerId ? { ...p, round: challenge ? roundId : null } : p))
  const participants = challenge ? myView.filter((p) => p.round === roundId) : myView
  const othersDone = participants.every((p) => p.playerId === playerId || p.done)
  const roundClosed = finished && (othersDone || roundDeadline)
  const stillPlaying = participants.filter((p) => p.playerId !== playerId && !p.done)
  /**
   * Lobideyken odada süren bir tur var mı (start'ı kaçırdıysam ya da sonradan katıldıysam).
   *
   * ⚠ BENİM BİTİRDİĞİM tur sayılmaz: kullanıcı bildirdi ki tur bitince rakibin
   * `round` bilgisi eski tur id'sinde donup kalıyor ve iki taraf da öbürünü "hâlâ
   * oynuyor" sanıyor → `canStart` sonsuza dek false, rövanş HİÇ açılmıyor.
   * Bitirdiğim turun id'sini hatırlayıp o turdaki bayat kayıtları yok sayıyorum;
   * böylece rakibin son mesajı düşse bile oda kilitlenmiyor.
   */
  const othersInRound = !challenge && view.some((p) => (
    p.playerId !== playerId
    && p.round !== null
    && p.round !== finishedRoundRef.current
    && !p.done
  ))

  // Skor tablosu HERKESİ gösterir (izleyici "👀" işaretli); sonuç yalnız katılımcıları.
  // Sonuç listesi kapanış ANINDA dondurulur (finalRanking): sonuca bakarken "Evet"
  // deyip lobiye dönen ya da odadan çıkan oyuncunun satırı gözden kaybolmasın.
  const ranked = rankPlayers(myView)
  const resultRanked = finalRanking ?? rankPlayers(participants)
  const winners = winnersOf(resultRanked)
  /*
   * Rakip YOKSA kazanan da yok. `winnersOf([ben])` beni kazanan sayıyor; rakip
   * hiç görünmediyse ya da tur ortasında çıktıysa ekranda "🏆 Turu sen kazandın"
   * yazması yanlış — üstelik bağlantı sorununu ZAFER gibi gösterip gizliyordu
   * (kullanıcı "hep kazanan oluyoruz" diye bildirdi). Rozet kuralı zaten
   * ≥2 katılımcı istiyordu; ekran metni de aynı eşiğe bağlandı.
   */
  const hadRival = resultRanked.length >= 2
  const iWon = hadRival && winners.some((w) => w.playerId === playerId)
  const isTie = hadRival && winners.length > 1
  /** Tur sonunda bulunamayan şampiyonlar — tek kişilikteki "Kaçırdıkların" listesi */
  const missed = useMemo(
    () => (challenge ? challenge.ids.filter((id) => !found.includes(id)) : []),
    [challenge, found],
  )

  // ---- Oda bağlantısı ----
  const playersRef = useRef<RoomPlayer[]>([])
  playersRef.current = players

  /**
   * `create`: "Oda Kur" mu "Katıl" mı. Realtime kanalları EFEMER — olmayan bir
   * kod da başarıyla bağlanır ve oyuncu boş odada bekler. Sunucuda "bu oda var mı"
   * diye sorulacak bir şey yok; varlık kanıtı = odada BAŞKA birinin görünmesi.
   * Bu yüzden katılırken 2 sn tanınır, kimse yoksa oda yok sayılır.
   */
  const connect = useCallback((code: string, create: boolean) => {
    setNotFound(false)
    const handle = joinRoom(code, { playerId, nick: nick.trim() || 'Oyuncu' }, {
      onPlayers: setPlayers,
      onStart: (r) => {
        // Aynı turun mükerrer 'start'ı yarım turu SIFIRLAMASIN (bugün gönderilmiyor
        // ama tek koruma "gönderilmiyor olması" olmasın)
        if (r.roundId === roundIdRef.current) return
        // Yeni tur — herkes AYNI ölçütle sıfırdan başlar
        roundIdRef.current = r.roundId
        lastLabelRef.current = r.label // bir sonraki turda aynı ölçüt tekrar gelmesin
        startAtRef.current = Date.now()
        setNowTick(Date.now())
        setPenaltySec(0)
        setRoundId(r.roundId)
        setChallenge({ label: r.label, ids: r.ids })
        setFound([]); setWrong([]); setWrongStreak(0); setPenalty(false)
        setLiveScores({}) // yeni turda eski skorlar taşınmasın
        setOver(false)
        setRoundDeadline(false)
        setRematchLeft(null) // önceki turun "tekrar oyna?" sayacı kapansın
        setFinalRanking(null)
        handleRef.current?.setReady(false) // hazır bayrağı yeni tura taşınmaz
      },
      onScore: (pid, score, done, round) => setLiveScores((s) => ({ ...s, [pid]: { score, done, round } })),
      onStatus: setStatus,
    })
    if (!handle) return
    handleRef.current = handle
    setRoom(code)

    if (!create) {
      /*
       * Eskiden tek seferlik 2 sn'lik `setTimeout` vardı: presence 1 ms geç gelirse
       * oyuncu VAR OLAN odadan atılıyordu ve kanal kapatıldığı için geri dönüş yoktu
       * (iki sekmeli testte tam bu yaşandı — Veli 1,6 sn yalnız kendini gördü, 2,0'da
       * "oda yok" yedi). Şimdi 500 ms aralıkla JOIN_PROBE_MS'e kadar yoklanıyor:
       * biri görünür görünmez sessizce kalınır, hiç görünmezse eski uyarı verilir.
       */
      const deadline = Date.now() + JOIN_PROBE_MS
      const probe = setInterval(() => {
        const others = playersRef.current.filter((p) => p.playerId !== playerId)
        if (others.length > 0) { clearInterval(probe); return } // oda gerçek — sessizce kal
        if (Date.now() < deadline) return                       // biraz daha bekle
        clearInterval(probe)
        handleRef.current?.leave()
        handleRef.current = null
        setRoom(null)
        setPlayers([])
        setNotFound(true)
      }, 500)
      joinProbeRef.current = probe
    }
  }, [playerId, nick])

  // Ekrandan çıkarken kanalı kapat (yoksa oyuncu odada "hayalet" kalır) + yoklamayı durdur
  useEffect(() => () => {
    if (joinProbeRef.current) clearInterval(joinProbeRef.current)
    handleRef.current?.leave()
  }, [])

  // Escape = çıkış onayından vazgeç
  useEffect(() => {
    if (!confirmExit) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setConfirmExit(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmExit])

  // ---- Sayaç: yalnız EKRANI tazeler; kalan süre duvar saatinden türetiliyor ----
  useEffect(() => {
    if (!inRound) return
    const t = setInterval(() => setNowTick(Date.now()), 250)
    return () => clearInterval(t)
  }, [inRound])

  useEffect(() => {
    if (challenge && !over && left === 0) setOver(true)
  }, [challenge, over, left])

  // Skorumu odaya bildir — her değişimde ANINDA
  useEffect(() => {
    if (!room || !challenge || !roundId) return
    handleRef.current?.updateScore(found.length, finished, roundId)
  }, [room, challenge, roundId, found.length, finished])

  /*
   * ...ve saniyede bir TEKRAR (nabız). İki tarayıcı testinde bir oyuncunun skoru
   * karşıya hiç ulaşmadı: tek seferlik mesaj düşerse skor bir sonraki bulguya
   * kadar bayat kalıyordu. Nabız kaybolan mesajı kendiliğinden onarır — bedeli
   * saniyede tek küçük mesaj. Son değer ref'ten okunur ki interval her
   * skor değişiminde yeniden kurulmasın.
   */
  const scoreRef = useRef<{ score: number; done: boolean; round: string | null }>({ score: 0, done: false, round: null })
  scoreRef.current = { score: found.length, done: finished, round: roundId }
  useEffect(() => {
    if (!room || !challenge) return
    const push = () => handleRef.current?.updateScore(scoreRef.current.score, scoreRef.current.done, scoreRef.current.round)
    // 1 sn'den 2 sn'ye çıkarıldı: nabzın işi KAYBOLAN mesajı onarmak, akış üretmek
    // değil. Sık nabız presence/broadcast hız sınırını zorluyordu (bkz. counterRoom).
    const t = setInterval(push, 2000)
    /*
     * Sekme arka plandayken tarayıcı `setInterval`i saniyede bire kısar, sekme
     * dondurulursa büsbütün durdurabilir — o sırada gönderilen skorlar rakibe geç
     * ulaşır ya da hiç ulaşmaz (iki sekmeli testte arka plandaki oyuncunun skoru
     * karşıya geçmedi). Sekme öne gelir gelmez nabzı BEKLEMEDEN durumu yeniden
     * yayınla ki tablo anında doğruya otursun.
     */
    const onVisible = () => { if (document.visibilityState === 'visible') push() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [room, challenge])

  /** Kapanış anındaki sıralamanın taze kopyası — dondurma efekti bunu okur */
  const latestResultRef = useRef<RoomPlayer[]>([])
  latestResultRef.current = rankPlayers(participants)

  /**
   * Sonuç ekranından lobiye dön (tur temizlenir, ODA korunur).
   * Aşağıdaki geri sayım efektinden ÖNCE tanımlı olmalı — efektin bağımlılık
   * dizisi render sırasında okunuyor, sonra tanımlansaydı TDZ hatası verirdi.
   */
  const backToLobby = useCallback(() => {
    setRematchLeft(null)
    // Bitirdiğim turu işaretle: rakibin bu tura ait bayat "hâlâ oynuyor" kaydı
    // yeni tur başlatmayı engellemesin (bkz. othersInRound)
    finishedRoundRef.current = roundIdRef.current
    setChallenge(null)
    setRoundId(null)
    roundIdRef.current = null
    setFound([]); setWrong([]); setWrongStreak(0); setPenalty(false)
    setPenaltySec(0)
    setLiveScores({})
    setOver(false)
    setFinalRanking(null)
    // Odaya "turdan çıktım" de — yoksa sonradan katılan, bayat round değerine
    // bakıp "tur sürüyor" sanır
    handleRef.current?.updateScore(0, false, null)
  }, [])

  // Turun küresel son tarihi — roundId başına bir kez kurulur
  useEffect(() => {
    if (!roundId) return
    const t = setTimeout(() => setRoundDeadline(true), (COUNT_SECONDS + 3) * 1000)
    return () => clearTimeout(t)
  }, [roundId])

  // KİŞİSEL bitiş sesi — kendi süren dolduğunda çalar, beklemeye geçsen bile
  const endedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!finished || !roundId || endedRef.current === roundId) return
    endedRef.current = roundId
    if (allFound) playWin(); else playLose()
  }, [finished, roundId, allFound])

  // "Tekrar oyna?" sayacı TUR KAPANINCA başlar (herkes bitince / son tarih geçince);
  // sonuç sıralaması da o anda dondurulur
  const rematchStartedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!roundClosed || !roundId || rematchStartedRef.current === roundId) return
    rematchStartedRef.current = roundId
    const finalR = latestResultRef.current
    setFinalRanking(finalR)
    setRematchLeft(REMATCH_SECONDS)
    /*
     * Meydan okuma rozetleri (vt:chwin) artık BURADAN beslenir — eski link tabanlı
     * meydan okuma kaldırıldı (Faz 1b). Galibiyet sayılır: gerçekten rakip vardı
     * (≥2 katılımcı) ve TEK galip benim. Beraberlik sayılmaz (eski kuralla tutarlı:
     * beraberlik "kazandın" değildi). evaluateAchievements sessiz çağrılır —
     * toast sistemi GameScreen'de (mini oyunlarla aynı kural), Başarım paneli
     * zaten açılışta kendini eşitliyor; burada çağırmak kazanım TARİHİNİ doğru tutar.
     */
    const ws = winnersOf(finalR)
    if (finalR.length >= 2 && ws.length === 1 && ws[0].playerId === playerId) {
      recordChallengeWin()
      evaluateAchievements()
    }
  }, [roundClosed, roundId, playerId])

  /**
   * Tur sonu kararı: Evet → lobide "hazır" olarak kal · Hayır → odadan çık ·
   * **cevap yok → 15 sn sonra lobiye dön** (hazır işaretlenmeden). Sonuç ekranında
   * süresiz beklemek odayı kilitliyordu: host yeni tur açsa bile herkes hâlâ eski
   * sonuç kartına bakıyordu.
   */
  useEffect(() => {
    if (rematchLeft === null) return
    if (rematchLeft <= 0) { backToLobby(); return }
    const t = setTimeout(() => setRematchLeft((s) => (s === null ? null : s - 1)), 1000)
    return () => clearTimeout(t)
  }, [rematchLeft, backToLobby])

  function pick(id: string) {
    if (!challenge || finished) return
    if (found.includes(id) || wrong.includes(id)) return
    if (!isInChallenge(challenge, id)) {
      setWrong((w) => [...w, id])
      setShake(true)
      const streak = wrongStreak + 1
      if (streak >= WRONG_STREAK_PENALTY) {
        setWrongStreak(0)
        setPenaltySec((s) => s + PENALTY_SECONDS) // süre duvar saatinden türetiliyor; ceza toplamda
        setPenalty(true)
        setTimeout(() => setPenalty(false), 1500)
        playLose()
      } else {
        setWrongStreak(streak)
        playWrong()
      }
      return
    }
    setFound((f) => [...f, id])
    setWrongStreak(0)
    playCorrect()
  }

  // Tek kişilik multi anlamsız: en az 2 oyuncu. Kısıt yalnız BAŞLATMADA —
  // tur sürerken öteki çıkarsa tur yarıda kesilmez. `othersInRound` kapısı da şart:
  // host erken lobiye dönmüşken başlatabilseydi, HERKESİN yarım turu sıfırlanırdı
  // (onStart yeni roundId görünce durumu resetler).
  const canStart = players.length >= 2 && !othersInRound

  function startRound() {
    if (!canStart) return
    // lastLabelRef: "Yeni Tur" sonuç kartından da lobiden de gelse, bir önceki
    // ölçüt tekrar gelmez (challenge lobiye dönüşte null'lanıyor, ref kalıyor)
    handleRef.current?.start(randomChallenge(lastLabelRef.current))
  }

  function leaveRoom() {
    handleRef.current?.leave()
    handleRef.current = null
    onExit()
  }

  async function shareCode() {
    if (!room) return
    // YALNIZ kod kopyalanır. Önce açıklama cümlesiyle birlikte kopyalanıyordu;
    // karşı taraf mesajın tamamını giriş kutusuna yapıştırınca kod bozuluyordu.
    if (await copyToClipboard(room)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // ---- Sunucu yoksa açıkça söyle (sessiz boş ekran verme) ----
  if (!isLeaderboardEnabled) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-3 pt-10 text-center">
        <div className="text-5xl">🔌</div>
        <h2 className="font-display text-xl font-bold">Multiplayer kapalı</h2>
        <p className="max-w-sm text-sm" style={{ color: 'var(--text-dim)' }}>
          Gerçek zamanlı oda için sunucu ayarı (Supabase) gerekiyor; bu kurulumda tanımlı değil.
          Tek kişilik "Kaç Tane?" çalışmaya devam ediyor.
        </p>
        <button onClick={onExit} className="btn-gold rounded-xl px-6 py-2.5 font-bold">← Menü</button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl lg:max-w-5xl flex-col items-center gap-4 px-3 pb-10">
      {/* Üst bar */}
      <div className="flex w-full items-center justify-between gap-2 border-b pt-3 pb-2" style={{ borderColor: 'var(--border)' }}>
        {/* Odadayken tek tıkla çıkma YOK: yanlışlıkla basınca tur ve skor gidiyor */}
        <button onClick={() => (room ? setConfirmExit(true) : onExit())}
          className="card-btn rounded-xl border px-3 py-1.5 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
          ← Menü
        </button>
        <span className="font-display font-semibold" style={{ color: 'var(--gold)' }}>
          Kaç Tane? · 👥 {room ?? 'Multi'}
        </span>
        {inRound ? (
          <span className="flex items-center gap-2">
            {penalty && (
              <span className="anim-pop rounded-md px-1.5 py-0.5 text-xs font-bold"
                style={{ background: 'var(--danger)', color: '#fff' }}>
                −{PENALTY_SECONDS}s
              </span>
            )}
            <span className={`rounded-xl px-3 py-1.5 font-mono font-bold ${left <= 10 ? 'anim-pulse' : ''}`}
              style={{ background: left <= 10 ? 'var(--danger)' : 'var(--bg-card)', color: '#fff' }}>
              {left}s
            </span>
          </span>
        ) : <span className="w-14" />}
      </div>

      {/* ---- LOBİ (odaya girmeden) ---- */}
      {!room && (
        <div className="flex w-full max-w-sm flex-col items-center gap-4 pt-6 text-center">
          <div className="text-5xl">👥</div>
          <h2 className="font-display text-xl font-bold">Odaya Gel</h2>
          <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
            Bir oda kur, kodu arkadaşlarına at. Herkes <b style={{ color: 'var(--text)' }}>aynı ölçütü aynı anda</b> oynar;
            kim daha çok bulacak?
          </p>

          <label className="w-full text-left">
            <span className="mb-1 block text-xs uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Takma adın</span>
            <input
              value={nick}
              onChange={(e) => { setNickState(e.target.value); setNick(e.target.value) }}
              maxLength={16}
              placeholder="Adın"
              className="w-full rounded-xl border px-4 py-2.5 outline-none"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </label>

          <button onClick={() => connect(makeRoomCode(), true)}
            className="btn-gold w-full rounded-xl px-6 py-3 text-lg font-bold">
            Oda Kur
          </button>

          <div className="flex w-full items-center gap-2 text-xs" style={{ color: 'var(--text-dim)' }}>
            <span className="h-px flex-1" style={{ background: 'var(--border)' }} /> ya da
            <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
          </div>

          <div className="flex w-full gap-2">
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(parseRoomCode(e.target.value))}
              onKeyDown={(e) => { if (e.key === 'Enter' && codeInput.length === ROOM_CODE_LEN) connect(codeInput, false) }}
              placeholder="ODA KODU"
              className="min-w-0 flex-1 rounded-xl border px-4 py-3 text-center font-mono text-lg tracking-[0.3em] outline-none"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            <button onClick={() => connect(codeInput, false)} disabled={codeInput.length !== ROOM_CODE_LEN}
              className="card-btn shrink-0 rounded-xl border px-5 py-3 font-bold"
              style={{
                borderColor: codeInput.length === ROOM_CODE_LEN ? 'var(--gold)' : 'var(--border)',
                color: codeInput.length === ROOM_CODE_LEN ? 'var(--gold)' : 'var(--text-dim)',
                opacity: codeInput.length === ROOM_CODE_LEN ? 1 : 0.5,
              }}>
              Katıl
            </button>
          </div>

          {notFound && (
            <p className="anim-pop text-sm" style={{ color: 'var(--danger-text)' }}>
              ⚠ Böyle bir oda yok (ya da içindeki herkes çıkmış). Kodu kontrol et.
            </p>
          )}
        </div>
      )}

      {/* ---- ODADAYIZ ---- */}
      {/*
       * Masaüstünde iki kolon: SOL oyun akışı (oda kartı/lobi/tur/sonuç), SAĞ
       * yapışkan canlı skor tablosu — skor için aşağı kaydırma biter. Mobilde
       * flex-col DOM sırası aynen korunur (kod kartı → tablo → akış).
       */}
      {room && (
        <div className="flex w-full flex-col gap-4 lg:grid lg:grid-cols-[1.55fr_1fr] lg:items-start lg:gap-5">
          {/* Oda kodu + durum */}
          {!inRound && (
            <div className="w-full rounded-2xl border p-4 text-center" style={{ borderColor: 'var(--gold)', background: 'var(--bg-card)' }}>
              <div className="section-label">Oda Kodu</div>
              <div className="font-mono text-4xl font-bold tracking-[0.35em]" style={{ color: 'var(--gold-bright)' }}>{room}</div>
              <button onClick={shareCode} className="mt-2 card-btn rounded-lg border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
                {copied ? '✓ Kopyalandı' : 'Kodu kopyala'}
              </button>
              {status !== 'joined' && (
                <p className="mt-2 text-xs" style={{ color: status === 'error' ? 'var(--danger-text)' : 'var(--text-dim)' }}>
                  {status === 'error' ? '⚠ Bağlantı kurulamadı — kodu kontrol et ya da tekrar dene.' : 'Bağlanıyor…'}
                </p>
              )}
            </div>
          )}

          {/* Canlı skor tablosu — hem turda hem lobide; masaüstünde sağda YAPIŞKAN */}
          <div className="w-full rounded-xl border p-3 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-4"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <div className="section-label mb-2 flex items-center justify-between">
              <span>Oyuncular ({players.length})</span>
              {challenge && <span>{found.length}/{total} sen</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              {ranked.map((p, i) => {
                const isMe = p.playerId === playerId
                return (
                  <div key={p.playerId} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
                    style={{
                      background: isMe ? 'var(--gold-soft)' : 'transparent',
                      boxShadow: isMe ? 'inset 3px 0 0 0 var(--gold)' : undefined,
                    }}>
                    <span className="w-5 shrink-0 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
                      {challenge ? i + 1 : '•'}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold" style={{ color: isMe ? 'var(--gold-bright)' : 'var(--text)' }}>
                      {p.nick}{isMe && ' (sen)'}
                      {host?.playerId === p.playerId && <span title="Oda sahibi"> 👑</span>}
                      {/* Lobide: kim tekrar oynamak istiyor */}
                      {!challenge && p.ready && <span title="Tekrar oynamaya hazır" style={{ color: 'var(--accent-done)' }}> ✓ hazır</span>}
                    </span>
                    {challenge && (p.round === roundId ? (
                      <>
                        <span className="w-24 overflow-hidden rounded-full" style={{ height: 6, background: 'var(--bg-input)' }}>
                          <span className="block h-full rounded-full transition-all duration-300"
                            style={{ width: `${(p.score / Math.max(1, total)) * 100}%`, background: isMe ? 'var(--gold)' : 'var(--accent-endless)' }} />
                        </span>
                        <span className="w-8 shrink-0 text-right font-bold tabular-nums" style={{ color: 'var(--gold)' }}>{p.score}</span>
                        <span className="w-4 shrink-0 text-xs">{p.done ? '✓' : ''}</span>
                      </>
                    ) : (
                      // Bu turda oynamıyor (tur ortasında katıldı / lobiden izliyor)
                      <span className="shrink-0 text-xs" style={{ color: 'var(--text-dim)' }} title="Bu turda oynamıyor">👀 izliyor</span>
                    ))}
                  </div>
                )
              })}
              {players.length === 0 && (
                <p className="py-2 text-center text-xs" style={{ color: 'var(--text-dim)' }}>Bağlanıyor…</p>
              )}
            </div>
          </div>

          {/* SOL kolon devamı: lobi / tur / sonuç akışı */}
          <div className="flex w-full flex-col gap-4 lg:col-start-1">
          {/* Tur yoksa: başlat / bekle */}
          {!challenge && othersInRound && (
            <div className="flex w-full flex-col items-center gap-1.5 pt-2 text-center">
              <p className="text-sm anim-pulse" style={{ color: 'var(--gold)' }}>
                🎮 Odada tur sürüyor — bitmesini bekle, sonraki tura katılırsın.
              </p>
            </div>
          )}
          {!challenge && !othersInRound && (
            <div className="flex w-full flex-col items-center gap-2 pt-2 text-center">
              {isHost ? (
                <>
                  <button onClick={startRound} disabled={!canStart}
                    className="btn-gold rounded-xl px-8 py-3 text-lg font-bold"
                    style={canStart ? undefined : { opacity: 0.5, cursor: 'not-allowed' }}>
                    Turu Başlat
                  </button>
                  <p className="text-xs" style={{ color: canStart ? 'var(--text-dim)' : 'var(--danger-text)' }}>
                    {canStart
                      ? 'Oda sahibi sensin 👑 — herkes geldiğinde başlat.'
                      : 'Odada tek başınasın — en az 2 oyuncu gerek. Kodu paylaş 👆'}
                  </p>
                </>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                  Oda sahibinin ({host?.nick ?? '…'}) turu başlatması bekleniyor…
                </p>
              )}
              <p className="max-w-sm text-xs" style={{ color: 'var(--text-dim)' }}>
                Yanlış deneme serbest, ama üst üste <b style={{ color: 'var(--danger-text)' }}>{WRONG_STREAK_PENALTY} yanlış</b> süreden {PENALTY_SECONDS} sn yakar.
              </p>
            </div>
          )}

          {/* Tur */}
          {challenge && (
            <CounterBoard
              challenge={challenge}
              found={found}
              wrong={wrong}
              wrongStreak={wrongStreak}
              finished={finished}
              shake={shake}
              onShakeEnd={() => setShake(false)}
              onPick={pick}
            />
          )}

          {/* Ben bittim ama tur açık: diğerlerinin bitişi beklenir (sonuç/rematch YOK) */}
          {challenge && finished && !roundClosed && (
            <div className="anim-pop flex w-full flex-col items-center gap-1.5 rounded-xl border p-4 text-center"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <span className="font-display text-lg font-bold" style={{ color: 'var(--gold-bright)' }}>
                ✓ Bitirdin — {found.length}/{total}
              </span>
              <p className="text-sm anim-pulse" style={{ color: 'var(--text-dim)' }}>
                Diğer oyuncuların bitmesi bekleniyor…
              </p>
              {stillPlaying.length > 0 && (
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                  Hâlâ oynuyor: {stillPlaying.map((p) => p.nick).join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Tur sonu — HERKES bitince (ya da tur süresi dolunca) */}
          {challenge && roundClosed && (
            <div className="anim-pop flex w-full flex-col items-center gap-3 rounded-xl border p-4 text-center"
              style={{ borderColor: 'var(--gold)', background: 'var(--bg-card)' }}>
              <span className="font-display text-lg font-bold" style={{ color: 'var(--gold-bright)' }}>
                {/* Beraberlik ayrı söylenir — eskiden eşit skorlu iki oyuncudan yalnız biri "kazandın" görüyordu */}
                {isTie && iWon
                  ? `🤝 Berabere — ${found.length}/${total}`
                  : iWon
                    ? `🏆 Turu sen kazandın — ${found.length}/${total}`
                    : `Tur bitti — ${found.length}/${total}`}
              </span>
              <div className="flex w-full flex-col gap-1">
                {resultRanked.map((p, i) => (
                  <div key={p.playerId} className="flex items-center justify-between rounded-md px-2 py-1 text-sm"
                    style={{ background: p.playerId === playerId ? 'var(--gold-soft)' : 'transparent' }}>
                    <span className="truncate">
                      {isTie && winners.some((w) => w.playerId === p.playerId) ? '🤝' : (['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`)} {p.nick}
                    </span>
                    <b style={{ color: 'var(--gold)' }}>{p.score}</b>
                  </div>
                ))}
              </div>

              {/* Rakip görünmediyse bunu AÇIKÇA söyle — bağlantı sorunu zafer gibi durmasın */}
              {!hadRival && (
                <p className="text-xs" style={{ color: 'var(--danger-text)' }}>
                  ⚠ Bu turda başka oyuncu görünmedi — bağlantı ya da odaya katılma sorunu olabilir.
                </p>
              )}

              {/* Kaçırdıkların — tek kişilik moddaki liste, multi'de eksikti */}
              {missed.length > 0 && (
                <div className="w-full">
                  <div className="mb-1.5 text-xs uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                    Kaçırdıkların ({missed.length})
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {missed.map((id) => (
                      <span key={id} className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
                        <img src={squareUrl(id)} alt="" className="h-4 w-4 rounded" />
                        {byId(id)?.name ?? id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Tekrar oyna? — cevap gelmezse 15 sn sonra kendiliğinden lobiye döner */}
              <div className="w-full rounded-xl border p-3" style={{ borderColor: 'var(--gold)', background: 'var(--bg-input)' }}>
                <p className="text-sm font-bold">
                  Tekrar oynayalım mı?
                  {rematchLeft !== null && (
                    <span className="ml-2 font-mono" style={{ color: rematchLeft <= 5 ? 'var(--danger-text)' : 'var(--text-dim)' }}>
                      {rematchLeft}s
                    </span>
                  )}
                </p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => { handleRef.current?.setReady(true); backToLobby() }}
                    className="btn-gold flex-1 rounded-xl px-4 py-2 text-sm font-bold">
                    Evet, lobide kal
                  </button>
                  <button onClick={leaveRoom}
                    className="card-btn flex-1 rounded-xl border px-4 py-2 text-sm font-bold"
                    style={{ borderColor: 'var(--danger)', color: 'var(--danger-text)' }}>
                    Hayır, çık
                  </button>
                </div>
                <p className="mt-1.5 text-xs" style={{ color: 'var(--text-dim)' }}>
                  Cevap vermezsen süre dolunca lobiye dönersin.
                </p>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {confirmExit && (
        <ExitConfirm
          title="Odadan çıkılsın mı?"
          stayLabel="Odada kal"
          onStay={() => setConfirmExit(false)}
          onLeave={leaveRoom}
        >
          {inRound ? (
            <>Tur sürüyor — çıkarsan bu turdaki <b style={{ color: 'var(--text)' }}>{found.length} skorun</b> gider.
              {' '}Öteki oyuncular oynamaya devam ettiği için <b style={{ color: 'var(--danger-text)' }}>süre durmuyor.</b></>
          ) : (
            <>Odadan ayrılacaksın. Geri dönmek için kodu ({room}) tekrar girmen gerekir.</>
          )}
        </ExitConfirm>
      )}
    </div>
  )
}
