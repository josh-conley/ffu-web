import type { TeamLineup } from '@/data'
import { type LiveWeekContext, playerLiveProjection, projectionsByMember, withNflTeams, playerLiveStatus, projectedPoints, teamLiveProjection } from './liveProjection'

// Half-PPR-ish scoring; `pass_td` deliberately unscored so its projection must add nothing.
const scoring = { rec: 0.5, rec_yd: 0.1, rush_yd: 0.1 }

const ctx: LiveWeekContext = {
  scoring,
  games: {
    KC: { status: 'final', remaining: 0 },
    BUF: { status: 'live', remaining: 0.5 },
    DAL: { status: 'pre', remaining: 1 },
  },
  projections: {
    done: { team: 'KC', stats: { rec: 4, rec_yd: 60 } }, // 8 pts
    playing: { team: 'BUF', stats: { rush_yd: 100 } }, // 10 pts
    waiting: { team: 'DAL', stats: { rec: 6, rec_yd: 80, pass_td: 3 } }, // 11 pts
    bye: { team: 'SEA', stats: {} }, // SEA has no game this week
  },
}

describe('projectedPoints', () => {
  it('scores each stat by the league weight and ignores unscored stats', () => {
    expect(projectedPoints({ rec: 6, rec_yd: 80, pass_td: 3 }, scoring)).toBeCloseTo(11)
  })
})

describe('playerLiveStatus', () => {
  it('reads the status of the player\'s NFL game via their team', () => {
    expect(playerLiveStatus('done', ctx)).toBe('final')
    expect(playerLiveStatus('playing', ctx)).toBe('live')
    expect(playerLiveStatus('waiting', ctx)).toBe('pre')
  })

  it('is idle for a bye or an unknown player', () => {
    expect(playerLiveStatus('bye', ctx)).toBe('idle')
    expect(playerLiveStatus('nobody', ctx)).toBe('idle')
  })

  it('finds a team defense by its id even without a projection row', () => {
    expect(playerLiveStatus('BUF', ctx)).toBe('live')
  })
})

describe('playerLiveProjection', () => {
  it('is the actual score once the game is over', () => {
    expect(playerLiveProjection({ playerId: 'done', points: 14.3 }, ctx)).toBeCloseTo(14.3)
  })

  it('adds the projection for the share of the game left while it is live', () => {
    expect(playerLiveProjection({ playerId: 'playing', points: 7 }, ctx)).toBeCloseTo(7 + 10 * 0.5)
  })

  it('is the full projection before kickoff', () => {
    expect(playerLiveProjection({ playerId: 'waiting', points: 0 }, ctx)).toBeCloseTo(11)
  })

  it('falls back to the actual score when there is no game or projection', () => {
    expect(playerLiveProjection({ playerId: 'bye', points: 0 }, ctx)).toBe(0)
    expect(playerLiveProjection({ playerId: 'nobody', points: 3 }, ctx)).toBe(3)
  })
})

describe('teamLiveProjection', () => {
  const lineup = (ids: string[]): TeamLineup => ({
    memberId: 'm',
    starters: ids.map((playerId) => ({ playerId, points: playerId === 'done' ? 14 : playerId === 'playing' ? 7 : 0 })),
    bench: [{ playerId: 'waiting', points: 0 }],
  })

  it('sums the starters\' live projections (the bench never counts)', () => {
    expect(teamLiveProjection(lineup(['done', 'playing', 'waiting']), ctx)).toBeCloseTo(14 + 12 + 11)
  })

  it('is undefined when no starter has a game left to play', () => {
    expect(teamLiveProjection(lineup(['done', 'bye']), ctx)).toBeUndefined()
  })
})

describe('projectionsByMember', () => {
  it('maps each team still playing to its projection and leaves finished teams out', () => {
    const teams: TeamLineup[] = [
      { memberId: 'a', starters: [{ playerId: 'waiting', points: 0 }], bench: [] },
      { memberId: 'b', starters: [{ playerId: 'done', points: 9 }], bench: [] },
    ]
    const out = projectionsByMember(teams, ctx)
    expect(out.get('a')).toBeCloseTo(11)
    expect(out.has('b')).toBe(false)
  })
})

describe('withNflTeams', () => {
  it('fills each player\'s team from the projections, keeping any team already known', () => {
    const lineup: TeamLineup = {
      memberId: 'm',
      starters: [{ playerId: 'waiting', points: 0 }, { playerId: 'nobody', points: 0 }],
      bench: [{ playerId: 'done', points: 0, team: 'NYJ' }],
    }
    const out = withNflTeams(lineup, ctx.projections)
    expect(out.starters).toEqual([{ playerId: 'waiting', points: 0, team: 'DAL' }, { playerId: 'nobody', points: 0 }])
    expect(out.bench[0]?.team).toBe('NYJ')
  })
})
