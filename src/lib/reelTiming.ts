// When each crest crosses the reel's centre marker.
//
// The reel scrolls at full speed, then brakes to a stop. A wheel ticks once per crest — so to make
// the audio sound like the picture, the tick times have to come from the SAME motion rather than
// from an evenly spaced count. One definition drives both, which is why they can't drift apart.
//
// The motion is modelled physically rather than as a hand-tuned Bézier (retuned 2026-09-29). A
// spinning wheel slowed by constant friction loses speed at a constant rate, so its speed falls in a
// straight line to zero. The Bézier this replaced crept faster through its first 60% and then
// crammed nearly all of its slowing into the last ~1.5s — heard as a steady buzz, a sudden brake and
// a long dead gap before the final click. Constant deceleration spreads the slowing out, the way a
// real wheel audibly winds down.

/** Share of the run spent at full speed before the brake comes on. */
const CRUISE = 0.3

/** Full speed, in reel-lengths per run, chosen so cruise + brake covers exactly the whole strip. */
const SPEED = 2 / (1 + CRUISE)
const CRUISE_DISTANCE = SPEED * CRUISE

/** Progress (0–1) at time fraction `t`: constant speed, then speed falling linearly to zero. */
export function progressAt(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  if (t <= CRUISE) return SPEED * t
  const braking = t - CRUISE
  return CRUISE_DISTANCE + SPEED * braking - (SPEED * braking * braking) / (2 * (1 - CRUISE))
}

/**
 * The time fraction at which the reel has covered `progress` of its distance — `progressAt`
 * inverted. Under the brake the distance still to go is v·s²/(2(1−c)), where s is the time left,
 * so it solves exactly.
 */
export function timeAtProgress(progress: number): number {
  if (progress <= 0) return 0
  if (progress >= 1) return 1
  if (progress <= CRUISE_DISTANCE) return progress / SPEED
  return 1 - Math.sqrt((2 * (1 - CRUISE) * (1 - progress)) / SPEED)
}

/**
 * The same motion as a CSS `linear()` easing, so the picture follows `progressAt` exactly. The
 * cruise is a straight line (two points); the brake is sampled finely enough that the piecewise
 * segments are invisible.
 */
function toCssLinear(brakeSamples = 32): string {
  const stops = ['0 0%', `${CRUISE_DISTANCE.toFixed(4)} ${(CRUISE * 100).toFixed(2)}%`]
  for (let i = 1; i <= brakeSamples; i++) {
    const t = CRUISE + ((1 - CRUISE) * i) / brakeSamples
    stops.push(`${progressAt(t).toFixed(4)} ${(t * 100).toFixed(2)}%`)
  }
  return `linear(${stops.join(', ')})`
}

export const REEL_EASING_CSS = toCssLinear()

/**
 * Offsets in ms at which each of `crests` crests reaches the marker, the last landing exactly on
 * `durationMs`. Gaps widen as the reel slows — that deceleration IS the wheel sound.
 */
export function tickTimes(crests: number, durationMs: number): number[] {
  if (crests <= 0 || durationMs <= 0) return []
  return Array.from({ length: crests }, (_, i) => timeAtProgress((i + 1) / crests) * durationMs)
}
