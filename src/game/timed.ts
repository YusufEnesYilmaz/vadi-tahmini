/**
 * Zamana Karşı kalan süreyi duvar saatinden türetir.
 * Sayaç tık tık azaltılmaz; sekme arka planda kalsa da ilk ölçümde gerçek süreye oturur.
 */
export function getTimedSecondsLeft(
  startedAtMs: number,
  totalSeconds: number,
  nowMs: number,
  options: { pausedMs?: number; penaltySeconds?: number } = {},
): number {
  const safeTotal = Math.max(0, Math.floor(totalSeconds))
  const safePausedMs = Math.max(0, Math.floor(options.pausedMs ?? 0))
  const safePenaltySeconds = Math.max(0, Math.floor(options.penaltySeconds ?? 0))
  const elapsedMs = Math.max(0, Math.max(nowMs, startedAtMs) - startedAtMs - safePausedMs)
  const elapsedSeconds = Math.floor(elapsedMs / 1000)
  return Math.max(0, safeTotal - elapsedSeconds - safePenaltySeconds)
}
