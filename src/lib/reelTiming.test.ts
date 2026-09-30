import { REEL_EASING_CSS, progressAt, tickTimes, timeAtProgress } from './reelTiming'

describe('timeAtProgress', () => {
  it('pins the endpoints', () => {
    expect(timeAtProgress(0)).toBe(0)
    expect(timeAtProgress(1)).toBe(1)
  })

  it('is monotonic in progress', () => {
    let previous = -1
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const t = timeAtProgress(p)
      expect(t).toBeGreaterThanOrEqual(previous)
      previous = t
    }
  })

  it('front-loads the distance, as an ease-out does', () => {
    // Half the crests are past the marker well before half the time has elapsed.
    expect(timeAtProgress(0.5)).toBeLessThan(0.5)
  })

  it('inverts progressAt', () => {
    for (const t of [0.1, 0.3, 0.45, 0.6, 0.8, 0.95, 0.999]) expect(timeAtProgress(progressAt(t))).toBeCloseTo(t, 9)
  })
})

describe('progressAt', () => {
  // Speed over each small slice of the run.
  const speeds = Array.from({ length: 100 }, (_, i) => (progressAt((i + 1) / 100) - progressAt(i / 100)) * 100)

  it('never speeds up once running', () => {
    for (let i = 1; i < speeds.length; i++) expect(speeds[i]!).toBeLessThanOrEqual(speeds[i - 1]! + 1e-9)
  })

  // The physics: friction takes off the same amount of speed every instant, so under the brake the
  // speed falls in a straight line — equal drops per slice, arriving at zero at the end.
  it('brakes at a constant rate to a standstill', () => {
    const braking = speeds.slice(50)
    const drops = braking.slice(1).map((s, i) => braking[i]! - s)
    for (const d of drops) expect(d).toBeCloseTo(drops[0]!, 6)
    expect(speeds.at(-1)!).toBeLessThan(speeds[0]! * 0.02)
  })
})

describe('tickTimes', () => {
  const times = tickTimes(100, 5500)

  it('gives one tick per crest, the last landing on the end of the run', () => {
    expect(times).toHaveLength(100)
    expect(times.at(-1)).toBeCloseTo(5500, 5)
    expect(times[0]!).toBeGreaterThan(0)
  })

  it('is strictly increasing', () => {
    for (let i = 1; i < times.length; i++) expect(times[i]!).toBeGreaterThan(times[i - 1]!)
  })

  // The shape that matters: the wheel RUNS, then brakes. Asserted as shape rather than exact
  // numbers, so the curve can be re-tuned without rewriting the test — but a curve that brakes
  // immediately (the one this replaced) fails the first assertion outright.
  it('holds a steady pace through the first half of the run', () => {
    const gaps = times.slice(1).map((t, i) => t - times[i]!)
    const firstHalf = gaps.slice(0, Math.floor(gaps.length / 2))
    const fastest = Math.min(...firstHalf)
    const slowest = Math.max(...firstHalf)
    // Every gap in the first half is within 25% of every other — a hold, not a brake.
    expect(slowest / fastest).toBeLessThan(1.25)
  })

  it('then decelerates into a long final crawl', () => {
    const gaps = times.slice(1).map((t, i) => t - times[i]!)
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    const quarter = Math.floor(gaps.length / 4)

    expect(mean(gaps.slice(-quarter))).toBeGreaterThan(mean(gaps.slice(0, quarter)) * 2.5)
    expect(gaps.at(-1)!).toBeGreaterThan(gaps[0]! * 10)

    // Monotonic from the fastest crest onwards — once it starts slowing it never speeds up again.
    const fastestAt = gaps.indexOf(Math.min(...gaps))
    for (let i = fastestAt + 1; i < gaps.length; i++) {
      expect(gaps[i]!, `gap ${i}`).toBeGreaterThanOrEqual(gaps[i - 1]! - 1e-6)
    }
  })

  it('is empty for a degenerate run', () => {
    expect(tickTimes(0, 5500)).toEqual([])
    expect(tickTimes(100, 0)).toEqual([])
  })

  it('exports the same motion as CSS so the picture and the sound cannot drift', () => {
    expect(REEL_EASING_CSS).toMatch(/^linear\(0 0%, .* 1\.0000 100\.00%\)$/)
    // Every stop in the CSS sits on the model.
    for (const stop of REEL_EASING_CSS.slice(7, -1).split(', ')) {
      const [value, at] = stop.split(' ')
      expect(Number(value)).toBeCloseTo(progressAt(parseFloat(at!) / 100), 3)
    }
  })
})
