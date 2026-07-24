/**
 * Zamana Karşı kalan süresi duvar saatinden türetir.
 * Sayaç tık tık azaltılmaz; sekme arka planda kalsa da ilk ölçümde gerçek süreye oturur.
 */
export function getTimedSecondsLeft(startedAtMs: number, totalSeconds: number, nowMs: number): number {
  const safeTotal = Math.max(0, Math.floor(totalSeconds))
  const elapsedSeconds = Math.floor((Math.max(nowMs, startedAtMs) - startedAtMs) / 1000)
  return Math.max(0, safeTotal - elapsedSeconds)
}
