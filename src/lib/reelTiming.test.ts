import { REEL_EASING_CSS, tickTimes, timeAtProgress } from './reelTiming'

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
})

describe('tickTimes', () => {
  const times = tickTimes(30, 2600)

  it('gives one tick per crest, the last landing on the end of the run', () => {
    expect(times).toHaveLength(30)
    expect(times.at(-1)).toBeCloseTo(2600, 5)
    expect(times[0]!).toBeGreaterThan(0)
  })

  it('is strictly increasing', () => {
    for (let i = 1; i < times.length; i++) expect(times[i]!).toBeGreaterThan(times[i - 1]!)
  })

  it('decelerates hard across the run', () => {
    const gaps = times.slice(1).map((t, i) => t - times[i]!)
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    const third = Math.floor(gaps.length / 3)

    // The curve eases IN very slightly over the first few crests (~14.5ms → ~14.2ms) before it
    // slows, so gap-by-gap monotonicity is not true — and at a third of a frame it is inaudible.
    // What matters is the shape over the run: the end crawls compared with the start.
    expect(mean(gaps.slice(-third))).toBeGreaterThan(mean(gaps.slice(0, third)) * 10)
    expect(gaps.at(-1)!).toBeGreaterThan(gaps[0]! * 20)

    // Monotonic once past the brief spin-up, which is what the ear actually follows.
    for (let i = 4; i < gaps.length; i++) {
      expect(gaps[i]!, `gap ${i}`).toBeGreaterThanOrEqual(gaps[i - 1]!)
    }
  })

  it('is empty for a degenerate run', () => {
    expect(tickTimes(0, 2600)).toEqual([])
    expect(tickTimes(30, 0)).toEqual([])
  })

  it('exports the curve as CSS so the picture and the sound cannot drift', () => {
    expect(REEL_EASING_CSS).toBe('cubic-bezier(0.12, 0.7, 0.1, 1)')
  })
})
