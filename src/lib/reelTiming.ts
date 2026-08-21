// When each crest crosses the reel's centre marker.
//
// The reel is a CSS transition on `transform` with an ease-out curve, so crests stream past fast and
// then crawl to a stop. A wheel ticks once per crest — so to make the audio sound like the picture,
// the tick times have to come from the SAME curve rather than from an evenly spaced count. One
// definition drives both, which is why they can't drift apart.

/**
 * Shared by the CSS transition and the tick schedule.
 *
 * Tuned 2026-08-21 for a wheel that RUNS before it slows. The previous curve
 * (0.12, 0.7, 0.1, 1) held near its peak speed for only 8% of the run — it braked almost at once
 * and then crawled for two seconds. This one holds pace for roughly the first 60%, then decelerates
 * over the last 40%, which is how a real wheel behaves.
 */
export const REEL_CURVE = { x1: 0.6, y1: 0.78, x2: 0.5, y2: 1 } as const
export const REEL_EASING_CSS = `cubic-bezier(${REEL_CURVE.x1}, ${REEL_CURVE.y1}, ${REEL_CURVE.x2}, ${REEL_CURVE.y2})`

/** A cubic Bézier component with fixed endpoints 0 and 1, evaluated at parameter `t`. */
function bezier(t: number, p1: number, p2: number): number {
  const u = 1 - t
  return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t
}

/**
 * The time fraction at which the animation has covered `progress` of its distance.
 *
 * A CSS timing function maps time (x) to progress (y). Here the question is the other way round —
 * "when is the reel N crests along?" — so this solves y(t) = progress for the curve parameter, then
 * reads off x(t). Bisection: y is monotonic for this curve, and 40 steps is far below audible
 * resolution.
 */
export function timeAtProgress(progress: number, curve = REEL_CURVE): number {
  if (progress <= 0) return 0
  if (progress >= 1) return 1
  let lo = 0
  let hi = 1
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (bezier(mid, curve.y1, curve.y2) < progress) lo = mid
    else hi = mid
  }
  const t = (lo + hi) / 2
  return bezier(t, curve.x1, curve.x2)
}

/**
 * Offsets in ms at which each of `crests` crests reaches the marker, the last landing exactly on
 * `durationMs`. Gaps widen as the reel slows — that deceleration IS the wheel sound.
 */
export function tickTimes(crests: number, durationMs: number): number[] {
  if (crests <= 0 || durationMs <= 0) return []
  return Array.from({ length: crests }, (_, i) => timeAtProgress((i + 1) / crests) * durationMs)
}
