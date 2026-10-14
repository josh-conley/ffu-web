import { drawnCup, seedOf } from '@/test/drawnCup'
import { EMPTY_PICKS, dropOwed, isComplete, pickBracket, pickedChampion, setDrop, setWinner, validatePicks, type CupPicks } from './cupPickem'

const t = drawnCup
const better = (a: string | undefined, b: string | undefined) => (seedOf.get(a!)! < seedOf.get(b!)! ? a! : b!)

/** Fills every round by `choose`, dropping `drop(r18 winners)` after the Round of 18. */
function fill(choose: (a: string, b: string) => string, drop: (winners: string[]) => string): CupPicks {
  let picks = EMPTY_PICKS
  for (const round of t.rounds) {
    pickBracket(t, picks).find((r) => r.key === round.key)!.slots.forEach((s, j) => {
      picks = setWinner(t, picks, round.key, j, choose(s.a!, s.b!))
    })
    const r = pickBracket(t, picks).find((x) => x.key === round.key)!
    if (r.needsDrop) picks = setDrop(t, picks, round.key, drop(r.slots.map((s) => s.pick!)))
  }
  return picks
}

const chalk = fill(better, (w) => w.reduce((x, y) => (seedOf.get(x)! > seedOf.get(y)! ? x : y)))

describe('pickBracket', () => {
  it('opens on the 18 drawn ties with nothing later known', () => {
    const b = pickBracket(t, EMPTY_PICKS)
    expect(b.map((r) => r.slots.length)).toEqual([18, 9, 4, 2, 1])
    expect(b[1]!.slots.every((s) => s.a === undefined && s.b === undefined)).toBe(true)
    expect(b.map((r) => r.needsDrop)).toEqual([false, true, false, false, false])
  })

  it('pairs a chalk bracket the way the real one is seeded', () => {
    const b = pickBracket(t, chalk)
    const seeds = (key: string) => b.find((r) => r.key === key)!.slots.map((s) => [seedOf.get(s.a!), seedOf.get(s.b!)])
    expect(seeds('r8')).toEqual([[1, 8], [4, 5], [2, 7], [3, 6]])
    expect(seeds('final')).toEqual([[1, 2]])
    expect(pickedChampion(b)).toBe(chalk.winners.r36!.find((id) => seedOf.get(id!) === 1))
    expect(isComplete(b)).toBe(true)
  })

  it('re-seeds the quarterfinals around the picked drop', () => {
    const seed3 = [...seedOf].find(([, s]) => s === 3)![0]
    const picks = fill(better, () => seed3)
    const quarters = pickBracket(t, picks).find((r) => r.key === 'r8')!.slots.map((s) => [seedOf.get(s.a!), seedOf.get(s.b!)])
    expect(quarters.flat()).not.toContain(3)
    expect(quarters).toEqual([[1, 9], [5, 6], [2, 8], [4, 7]])
  })

  it('leaves the quarterfinals open until the drop is picked', () => {
    const b = pickBracket(t, { ...chalk, drops: {} })
    expect(b.find((r) => r.key === 'r8')!.slots.every((s) => s.a === undefined && s.pick === undefined)).toBe(true)
    expect(isComplete(b)).toBe(false)
    expect(dropOwed(b)?.key).toBe('r18')
    expect(dropOwed(pickBracket(t, chalk))).toBeUndefined()
    expect(dropOwed(pickBracket(t, EMPTY_PICKS))).toBeUndefined()
  })
})

describe('setWinner', () => {
  it('clears later picks an earlier change knocks out', () => {
    const first = pickBracket(t, chalk)[0]!.slots[0]!
    const upset = first.pick === first.a ? first.b! : first.a!
    const b = pickBracket(t, setWinner(t, chalk, 'r36', 0, upset))
    expect(b[1]!.slots[0]!.pick).toBeUndefined()
    expect(pickedChampion(b)).toBeUndefined()
    // Untouched halves of the bracket keep their picks.
    expect(b[1]!.slots[4]!.pick).toBeDefined()
  })
})

describe('validatePicks', () => {
  it('accepts a complete, consistent bracket', () => {
    expect(validatePicks(t, JSON.parse(JSON.stringify(chalk)))).toEqual(chalk)
  })
  it('rejects an incomplete bracket', () => {
    expect(validatePicks(t, setWinner(t, EMPTY_PICKS, 'r36', 0, t.rounds[0]!.matchups![0]!.a))).toBe('The bracket is not complete')
  })
  it('rejects a pick of a team not in that matchup', () => {
    const row = [...chalk.winners.r36!]
    row[0] = row[1]!
    // The stray pick is ignored, which leaves that matchup unpicked.
    expect(validatePicks(t, { ...chalk, winners: { ...chalk.winners, r36: row } })).toBe('The bracket is not complete')
  })
  it('rejects extra keys and malformed shapes', () => {
    expect(validatePicks(t, { ...chalk, winners: { ...chalk.winners, bogus: [] } })).toBe('Some picks do not match the bracket')
    expect(validatePicks(t, { winners: { r36: [1] }, drops: {} })).toBe('Picks are not in the expected shape')
    expect(validatePicks(t, null)).toBe('Picks are not in the expected shape')
  })
  it('refuses entries before the draw', () => {
    expect(validatePicks({ ...t, participants: [] }, chalk)).toBe('The draw has not been held yet')
  })
})
