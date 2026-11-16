import { clinchStatuses } from './playoffClinch'
import type { TeamLine } from './playoffTiebreak'

const line = (memberId: string, divisionId: number | undefined, wins: number, losses: number): TeamLine => ({
  memberId,
  ...(divisionId === undefined ? {} : { divisionId }),
  wins,
  losses,
  ties: 0,
  pointsFor: 0,
  winPct: wins / (wins + losses),
})

// Three divisions of two and a four-team field: the three division winners plus one wild card.
const field = { teams: 4, byes: 2, divisionWinnerSeeds: 2 }
const lines = [
  line('A', 1, 5, 0), line('B', 1, 0, 5),
  line('C', 2, 4, 1), line('D', 2, 1, 4),
  line('E', 3, 3, 2), line('F', 3, 2, 3),
]

describe('clinchStatuses', () => {
  it('with nothing left to play, settles everyone', () => {
    const status = clinchStatuses(lines, [], field)
    expect(Object.fromEntries(status)).toEqual({
      A: 'bye', // won division 1, and only one other division winner (C) can be level or ahead
      C: 'bye',
      E: 'division', // won division 3, but A and C are both ahead for the byes
      F: 'playoffs', // the best of the rest: the one wild card
      B: 'eliminated',
      D: 'eliminated',
    })
  })

  it('marks nothing it cannot prove while games are open', () => {
    // D and F still meet twice: F could finish 4-3 and take division 3, or D could catch it.
    const status = clinchStatuses(lines, [['D', 'F'], ['D', 'F']], field)
    expect(status.get('A')).toBe('bye')
    // F could reach 4-3, win division 3 and draw level with C: C's division is won, its bye is not.
    expect(status.get('C')).toBe('division')
    expect(status.get('F')).toBeUndefined()
    expect(status.get('D')).toBeUndefined()
    expect(status.get('B')).toBe('eliminated')
    // E is in fact safe in every outcome, but proving it needs D's and F's results together; the
    // bounds take each team's best case alone, so E waits for a mark rather than getting a wrong one.
    expect(status.get('E')).toBeUndefined()
  })

  it('never clinches on a level record: a tiebreak could go either way', () => {
    const status = clinchStatuses([line('A', 1, 4, 1), line('B', 1, 3, 1)], [['B', 'X']], field)
    expect(status.get('A')).not.toBe('bye')
    expect(status.get('A')).not.toBe('division')
  })

  it('without divisions, clinches on the best records alone', () => {
    const flat = [line('A', undefined, 5, 0), line('B', undefined, 4, 1), line('C', undefined, 1, 4), line('D', undefined, 0, 5)]
    const status = clinchStatuses(flat, [['C', 'D']], { teams: 2, byes: 1, divisionWinnerSeeds: 0 })
    expect(Object.fromEntries(status)).toEqual({ A: 'playoffs', B: 'playoffs', C: 'eliminated', D: 'eliminated' })
  })
})
