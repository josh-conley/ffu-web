import { makeRng } from '@/lib/cupDraw.mjs'
import { COURSE, type Course } from './course'
import { FPS, simulateRace, type RaceRecording } from './simulate'

// A marble race that ends the way the draw already decided.
//
// The seed has chosen the team (drawCup). The race only has to ACT IT OUT, honestly: every race
// here is real, unaltered physics. The trick is the order of operations. Blank marbles race
// first; only once the finishing order is known are the crests painted on, with the drawn team
// on the marble that won. Nothing is nudged, and the broadcast replays the exact recorded race.
//
// Several variants are raced (slightly different drops) and the most watchable is kept. That
// choice cannot favour any team: no marble has a team until after it is made.

export interface MarbleRace {
  recording: RaceRecording
  /** ffuId for each marble, by marble index. */
  teamOf: string[]
  course: Course
}

const VARIANTS = 8

/** Leader changes over the race: how often the marble furthest down the course changes. */
export function leadChanges(r: RaceRecording, finishY: number): number {
  let leader = -1
  let changes = 0
  for (let f = FPS; f < r.frames; f += 6) {
    let best = -1
    let bestY = -Infinity
    for (let i = 0; i < r.count; i++) {
      const y = r.positions[(f * r.count + i) * 2 + 1]!
      if (y > bestY) [best, bestY] = [i, y]
    }
    if (best !== leader) {
      if (leader !== -1) changes++
      leader = best
    }
    if (bestY >= finishY) break
  }
  return changes
}

/**
 * How watchable a race is: lead changes, and a finish that is close but still visible. A race
 * nobody finished scores -Infinity (it cannot produce a winner).
 */
export function dramaScore(r: RaceRecording, finishY: number): number {
  const finished = r.finishFrame.filter((f) => f >= 0).sort((a, b) => a - b)
  if (finished.length === 0) return -Infinity
  const margin = finished.length > 1 ? finished[1]! - finished[0]! : FPS * 3
  // A photo finish inside ~0.1s is invisible on a stream; beyond ~1s it is a procession.
  const finish = margin < 6 ? 0 : margin <= FPS ? 4 : Math.max(0, 4 - (margin - FPS) / 15)
  return leadChanges(r, finishY) + finish
}

/** Crests onto marbles: the drawn team on the race winner, everyone else shuffled by the seed. */
export function assignTeams(order: number[], teams: string[], winnerId: string, rng: () => number): string[] {
  const others = teams.filter((t) => t !== winnerId)
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[others[i], others[j]] = [others[j]!, others[i]!]
  }
  const teamOf = Array<string>(order.length)
  ;[winnerId, ...others].forEach((team, place) => {
    teamOf[order[place]!] = team
  })
  return teamOf
}

/**
 * The race for one matchup. Keyed on the draw seed AND the matchup, so replaying a draw from its
 * seed replays the same races too.
 */
export function raceFor(teams: string[], winnerId: string, drawSeed: string, matchup: number, course: Course = COURSE): MarbleRace {
  if (!teams.includes(winnerId)) throw new Error(`Marble race: ${winnerId} is not in the pool`)
  const key = `${drawSeed}#marbles#${matchup}`
  let best: RaceRecording | undefined
  let bestScore = -Infinity
  for (let v = 0; v < VARIANTS; v++) {
    const recording = simulateRace(course, teams.length, makeRng(`${key}#${v}`))
    const score = dramaScore(recording, course.finishY)
    if (score > bestScore) [best, bestScore] = [recording, score]
  }
  if (!best || bestScore === -Infinity) throw new Error('Marble race: no variant produced a finisher')
  return { recording: best, teamOf: assignTeams(best.order, teams, winnerId, makeRng(`${key}#crests`)), course }
}
