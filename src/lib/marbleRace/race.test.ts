import { makeRng } from '@/lib/cupDraw.mjs'
import { positionAt, standingsAt } from './playback'
import { assignTeams, raceFor } from './race'

// The race is theatre over a result the seed already chose, so the property that matters is that
// the drawn team ALWAYS wins it — whatever the pool — and that a seed replays the same race.

const pool = (n: number) => Array.from({ length: n }, (_, i) => `t-${i + 1}`)

describe('assignTeams', () => {
  it('puts the drawn team on the winning marble and every team on exactly one marble', () => {
    const order = [3, 0, 4, 1, 2]
    const teamOf = assignTeams(order, pool(5), 't-4', makeRng('x'))
    expect(teamOf[order[0]!]).toBe('t-4')
    expect([...teamOf].sort()).toEqual(pool(5).sort())
  })
})

describe('raceFor', () => {
  it.each([24, 7, 2])('the drawn team crosses the line first (%i marbles)', (n) => {
    const teams = pool(n)
    const winner = teams[n - 1]!
    const race = raceFor(teams, winner, 'seed-1', 3)
    const first = race.recording.order[0]!
    expect(race.teamOf[first]).toBe(winner)
    // …and it really did finish first in the recorded physics, not just on paper.
    const winnerFrame = race.recording.finishFrame[first]!
    expect(winnerFrame).toBeGreaterThanOrEqual(0)
    for (const f of race.recording.finishFrame) if (f >= 0) expect(f).toBeGreaterThanOrEqual(winnerFrame)
  })

  it('replays the same race from the same seed and matchup', () => {
    const a = raceFor(pool(12), 't-5', 'seed-1', 3)
    const b = raceFor(pool(12), 't-5', 'seed-1', 3)
    expect(b.teamOf).toEqual(a.teamOf)
    expect(b.recording.order).toEqual(a.recording.order)
  })

  it('refuses a winner that is not in the pool', () => {
    expect(() => raceFor(pool(4), 'nope', 's', 0)).toThrow(/not in the pool/)
  })
})

describe('standingsAt', () => {
  it('ends with the drawn team leading the board', () => {
    const race = raceFor(pool(10), 't-3', 'seed-2', 0)
    const last = race.recording.frames - 1
    expect(race.teamOf[standingsAt(race.recording, last)[0]!]).toBe('t-3')
  })

  it('orders marbles still racing by how far down the course they are', () => {
    const race = raceFor(pool(10), 't-3', 'seed-2', 0)
    const mid = Math.floor(race.recording.frames / 2)
    const ys = standingsAt(race.recording, mid).map((i) => positionAt(race.recording, mid, i).y)
    for (let k = 1; k < ys.length; k++) expect(ys[k]!).toBeLessThanOrEqual(ys[k - 1]!)
  })
})
