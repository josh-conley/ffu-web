import { makeRng } from '@/lib/cupDraw.mjs'

// "Last crest standing": the reveal for the live draw. The eligible crests in the bowl are knocked
// out one at a time until only the drawn team is left. Built for a Discord screen share, where
// fast motion smears: every step is one big, discrete change, and the pace slows right down for
// the last few so the tension lands.
//
// Like every reveal, it is presentation over a result drawCup already decided. The knockout order
// is shuffled from the draw seed (so a replay of the seed replays the same reveal), and the drawn
// team is simply never knocked out.

/** The order the other crests go out in. Everyone except the drawn team, shuffled from the seed. */
export function knockoutOrder(pool: string[], winnerId: string, drawSeed: string, matchup: number): string[] {
  const rng = makeRng(`${drawSeed}#knockout#${matchup}`)
  const out = pool.filter((id) => id !== winnerId)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/** Pause before a knockout, by how many crests are still lit: brisk while it's crowded, slow at the end. */
function gapMs(lit: number): number {
  if (lit > 6) return 300
  return { 6: 500, 5: 700, 4: 950, 3: 1300, 2: 1800 }[lit] ?? 300
}

/** When each knockout happens, in ms from the start, for a pool of `size` crests. */
export function knockoutTimes(size: number): number[] {
  const times: number[] = []
  let t = 0
  for (let lit = size; lit > 1; lit--) {
    t += gapMs(lit)
    times.push(t)
  }
  return times
}
