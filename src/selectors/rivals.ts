import type { SeasonData } from '@/data'
import { headToHead, lastMeeting, type H2HMeeting, type H2HRecord } from './headToHead'

// A member's record against every opponent they have ever met (Members page, "Rivals"). Built on
// `headToHead` so the pair's numbers here can never disagree with the Compare view's.
//
// Deliberately carries no win% or "who owns whom" verdict: the median pair has met about twice,
// and even 8-3 isn't a meaningful edge at that sample size — the raw record says what there is.

export interface Rival {
  opponentId: string
  record: H2HRecord
  /** Meetings of every kind, regular season and playoff. */
  games: number
  lastMet: H2HMeeting
}

/** Everyone `memberId` has played, most meetings first (then most recent meeting). */
export function rivals(seasons: SeasonData[], memberId: string): Rival[] {
  const opponents = new Set<string>()
  for (const season of seasons) {
    for (const game of season.games) {
      if (!game.participants.some((p) => p.memberId === memberId)) continue
      for (const p of game.participants) if (p.memberId !== memberId) opponents.add(p.memberId)
    }
  }
  const out: Rival[] = []
  for (const opponentId of opponents) {
    const record = headToHead(seasons, memberId, opponentId)
    const lastMet = lastMeeting(record)
    if (lastMet) out.push({ opponentId, record, games: record.meetings.length, lastMet })
  }
  return out.sort((a, b) => b.games - a.games || meetingOrder(b.lastMet) - meetingOrder(a.lastMet))
}

/** A meeting as one sortable number: year, then week. */
export const meetingOrder = (m: H2HMeeting): number => Number(m.year) * 100 + m.week
