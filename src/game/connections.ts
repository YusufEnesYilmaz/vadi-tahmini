import { allCriteria, type Criterion } from './bingo'
import { CHAMPIONS } from './data'
import { godMode } from './dev'
import { CONN_DAILY_KEY } from './miniDaily'
import { fnv1a, seededRng, todayKey } from './rng'
import { toLetters } from './wordle'

/*
 * Bağlantılar — 16 şampiyonu 4'erli 4 gizli gruba ayır (NYT Connections mekaniği).
 *
 * İşin kalbi üretici: 4 kriter seçilir, 4'er şampiyon atanır ve İKİ kapıdan geçer:
 *  1. TUZAK: en az 2 şampiyon başka bir seçili grubun kriterine DE uymalı —
 *     çapraz uyum yoksa gruplar ilk bakışta ayrışır, oyun trivial olur.
 *  2. TEK ÇÖZÜM: 16'nın 4-4-4-4 geçerli bölünmesi TAM 1 olmalı. Kaba kuvvet
 *     (2.6M bölme) YOK — budamalı backtracking sayacı, 2. çözümü görür görmez keser.
 */

export const CONN_GROUP_SIZE = 4
export const CONN_GROUP_COUNT = 4
/**
 * Yanlış hakkı SABİT 4 (her iki modda) — NYT paritesi. Ön seçmeli zorluk şeridi
 * kaldırıldı (2026-07-24, istek üzerine): "girdikten sonra zorluk seçmek anlamsız".
 * Yerine "🔎 İpucu" bir grubun etiketini açar ve 1 HAK yakar (Av modeliyle aynı).
 */
export const CONN_MISTAKES = 4

export interface ConnGroup {
  /** Kriter id'si (kayıtta grup kimliği olarak kullanılır) */
  id: string
  label: string
  championIds: string[]
  /** 0 = en kolay (en geniş havuz) … 3 = en zor; renk/emoji eşlemesi bileşende */
  tier: number
}

export interface ConnPuzzle {
  /** Çözüm grupları — tier sırasına göre (0..3) */
  groups: ConnGroup[]
  /** 16 şampiyonun başlangıç (karışık) dizilimi */
  championIds: string[]
}

/** Bağlantılar kriter havuzu: bingo kriterleri + ada dayalı ekstralar (hepsi veriden) */
export function connCriteria(): Criterion[] {
  const extra: Criterion[] = [
    { id: 'ad:kesme', label: 'Adında kesme işareti var', test: (c) => c.name.includes("'") },
    { id: 'ad:kisa', label: 'Kısa ad (4 harf ve altı)', test: (c) => toLetters(c.name).length <= 4 },
    { id: 'ad:uzun', label: 'Uzun ad (9 harf ve üstü)', test: (c) => toLetters(c.name).length >= 9 },
    { id: 'ad:cift', label: 'İki kelimeli ad', test: (c) => c.name.trim().includes(' ') },
  ]
  return [...allCriteria(), ...extra].filter(
    (k) => CHAMPIONS.filter(k.test).length >= CONN_GROUP_SIZE,
  )
}

function dimOf(id: string): string {
  return id.split(':')[0]
}

/**
 * 16 şampiyonun, her grup kendi kriterini sağlayacak şekilde kaç FARKLI 4-4-4-4
 * bölünmesi var? 2'yi görünce keser (tek çözüm sorusu için saymaya devam gereksiz).
 */
export function countPartitions(criteria: Criterion[], championIds: string[]): number {
  const champs = championIds.map((id) => CHAMPIONS.find((c) => c.id === id))
  if (champs.some((c) => !c)) return 0
  // Her şampiyonun girebileceği gruplar
  const cand = champs.map((ch) => {
    const list: number[] = []
    criteria.forEach((k, gi) => { if (k.test(ch!)) list.push(gi) })
    return list
  })
  if (cand.some((l) => l.length === 0)) return 0
  // En az adaylı şampiyondan başla — budama erken çalışır
  const order = cand.map((_, i) => i).sort((a, b) => cand[a].length - cand[b].length)
  const cap = Array(criteria.length).fill(CONN_GROUP_SIZE) as number[]
  let count = 0

  function rec(k: number) {
    if (count >= 2) return
    if (k === order.length) { count++; return }
    const i = order[k]
    for (const g of cand[i]) {
      if (cap[g] === 0) continue
      cap[g]--
      rec(k + 1)
      cap[g]++
      if (count >= 2) return
    }
  }

  rec(0)
  return count
}

function shuffled<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildConnectionsFromRng(rand: () => number): ConnPuzzle {
  const crits = connCriteria()

  for (let attempt = 0; attempt < 400; attempt++) {
    // 4 kriter — en az 2 farklı boyuttan
    const picked = shuffled(crits, rand).slice(0, CONN_GROUP_COUNT)
    if (new Set(picked.map((k) => dimOf(k.id))).size < 2) continue

    // En dar havuzdan başlayarak ata (geniş kriterlere seçenek kalsın)
    const poolSize = (k: Criterion) => CHAMPIONS.filter(k.test).length
    const assignOrder = [...picked].sort((a, b) => poolSize(a) - poolSize(b))
    const used = new Set<string>()
    const byCrit = new Map<string, string[]>()
    let fail = false
    for (const crit of assignOrder) {
      const pool = shuffled(CHAMPIONS.filter((c) => crit.test(c) && !used.has(c.id)), rand)
      if (pool.length < CONN_GROUP_SIZE) { fail = true; break }
      const chosen = pool.slice(0, CONN_GROUP_SIZE).map((c) => c.id)
      chosen.forEach((id) => used.add(id))
      byCrit.set(crit.id, chosen)
    }
    if (fail) continue

    // Tuzak: en az 2 şampiyon başka grubun kriterine DE uysun
    let cross = 0
    for (const crit of picked) {
      for (const id of byCrit.get(crit.id)!) {
        const ch = CHAMPIONS.find((c) => c.id === id)!
        if (picked.some((other) => other.id !== crit.id && other.test(ch))) cross++
      }
    }
    if (cross < 2) continue

    // Tek çözüm
    const allIds = picked.flatMap((k) => byCrit.get(k.id)!)
    if (countPartitions(picked, allIds) !== 1) continue

    // Kademe: en geniş havuz = kolay (0) … en dar = zor (3)
    const byBreadth = [...picked].sort((a, b) => poolSize(b) - poolSize(a))
    const groups: ConnGroup[] = byBreadth.map((crit, tier) => ({
      id: crit.id,
      label: crit.label,
      championIds: byCrit.get(crit.id)!,
      tier,
    }))

    return { groups, championIds: shuffled(allIds, rand) }
  }
  // 400 denemede çıkmadıysa kriter havuzu ciddi değişmiş demektir — test kırmızı yakar
  throw new Error('Bağlantılar: geçerli bulmaca üretilemedi')
}

/** Günlük bulmaca — tarihten deterministik (herkese aynı 16 + aynı gruplar) */
export function dailyConnections(): ConnPuzzle {
  return buildConnectionsFromRng(seededRng(fnv1a(`${todayKey()}:conn`)))
}

export function randomConnections(): ConnPuzzle {
  return buildConnectionsFromRng(() => Math.random())
}

/** Seçilen 4'lüyü değerlendir: tam grup mu, değilse "1 kala" var mı */
export function evaluateConnGuess(
  puzzle: ConnPuzzle,
  ids: string[],
): { group: ConnGroup | null; almost: boolean } {
  for (const g of puzzle.groups) {
    const hit = ids.filter((id) => g.championIds.includes(id)).length
    if (hit === CONN_GROUP_SIZE) return { group: g, almost: false }
  }
  const almost = puzzle.groups.some(
    (g) => ids.filter((id) => g.championIds.includes(id)).length === CONN_GROUP_SIZE - 1,
  )
  return { group: null, almost }
}

// ---- Günlük kalıcılık — bulmaca deterministik, kayda yalnız İLERLEME yazılır ----

export interface ConnDailySave {
  date: string
  /** Çözülen grupların kriter id'leri (çözülme sırasıyla) */
  solvedIds: string[]
  /** Her onaylanan 4'lü (paylaşım ızgarası bundan türür) */
  history: string[][]
  mistakes: number
  /** İpucuyla ETİKETİ açılan grupların id'leri. Eski kayıtlarda yok → []. */
  revealedIds?: string[]
  over: boolean
  won: boolean
}

export function loadDailyConnections(): ConnDailySave | null {
  if (godMode()) return null
  try {
    const raw = localStorage.getItem(CONN_DAILY_KEY)
    if (!raw) return null
    const save = JSON.parse(raw) as ConnDailySave
    if (save.date !== todayKey()) return null
    if (!Array.isArray(save.solvedIds) || !Array.isArray(save.history)) return null
    return save
  } catch {
    return null
  }
}

export function saveDailyConnections(save: ConnDailySave): void {
  try {
    localStorage.setItem(CONN_DAILY_KEY, JSON.stringify(save))
  } catch {
    // localStorage kapalı olabilir
  }
}

/** Galibiyet sayacı (+ hiç yanlış onaysız "kusursuz" sayacı) — rozetler okur */
export function recordConnectionsWin(perfect: boolean) {
  localStorage.setItem('vt:conn:wins', String(Number(localStorage.getItem('vt:conn:wins') ?? 0) + 1))
  if (perfect) {
    localStorage.setItem('vt:conn:perfect', String(Number(localStorage.getItem('vt:conn:perfect') ?? 0) + 1))
  }
}
