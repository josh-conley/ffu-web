import type { NflGameClock } from '@/data'
import { IDLE_POLL_MS, LIVE_POLL_MS, livePollDelay, scoresMoving } from './livePolling'

const HOUR = 60 * 60_000
const NOW = Date.UTC(2026, 9, 4, 18, 0) // a Sunday, 2pm ET

const game = (status: NflGameClock['status'], kickoff?: number): NflGameClock =>
  kickoff === undefined ? { status, remaining: 1, home: 'CHI', away: 'PHI' } : { status, remaining: 1, home: 'CHI', away: 'PHI', kickoff }

describe('scoresMoving', () => {
  it('is true while any game is live', () => {
    expect(scoresMoving([game('final', NOW - 20 * HOUR), game('live', NOW - HOUR)], NOW)).toBe(true)
  })

  it('counts a game as moving for a while after it ends, then not', () => {
    expect(scoresMoving([game('final', NOW - 3.5 * HOUR)], NOW)).toBe(true)
    expect(scoresMoving([game('final', NOW - 5 * HOUR)], NOW)).toBe(false)
  })

  it('treats a game past kickoff but still reported as pre-game as moving', () => {
    expect(scoresMoving([game('pre', NOW - 60_000)], NOW)).toBe(true)
  })

  it('is false with nothing on', () => {
    expect(scoresMoving([game('pre', NOW + 2 * HOUR), game('final', NOW - 24 * HOUR)], NOW)).toBe(false)
  })
})

describe('livePollDelay', () => {
  it('polls every minute while scores move', () => {
    expect(livePollDelay([game('live', NOW - HOUR)], NOW)).toBe(LIVE_POLL_MS)
  })

  it('assumes scores are moving without the game clocks', () => {
    expect(livePollDelay(undefined, NOW)).toBe(LIVE_POLL_MS)
  })

  it('wakes at the next kickoff when it is sooner than the idle wait', () => {
    expect(livePollDelay([game('pre', NOW + 5 * 60_000)], NOW)).toBe(5 * 60_000)
  })

  it('waits the idle interval when the next kickoff is further off', () => {
    expect(livePollDelay([game('pre', NOW + 26 * HOUR)], NOW)).toBe(IDLE_POLL_MS)
  })

  it('waits the idle interval once the week is over', () => {
    expect(livePollDelay([game('final', NOW - 30 * HOUR)], NOW)).toBe(IDLE_POLL_MS)
  })

  it('never waits less than a minute, even with kickoff seconds away', () => {
    expect(livePollDelay([game('pre', NOW + 5_000)], NOW)).toBe(LIVE_POLL_MS)
  })
})
