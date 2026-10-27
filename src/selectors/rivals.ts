import type { SeasonData, Tournament } from '@/data'
import { cupGames } from './cupHistory'
import { lastMeeting, pairRecord, type H2HMeeting, type H2HRecord } from './headToHead'

// A member's record against every opponent they have ever met (Members page, "Rivals"). Built on
// `headToHead` so the pair's numbers here can never disagree with the Compare view's.
//
// Deliberately carries no win% or "who owns whom" verdict: the median pair has met about twice,
// and even 8-3 isn't a meaningful edge at that sample size — the raw record says what there is.

export interface Rival {
  opponentId: string
  record: H2HRecord
  /** Meetings of every kind: regular season, playoff and Cup. */
  games: number
  lastMet: H2HMeeting
}

/** Everyone `memberId` has played, most meetings first (then most recent meeting). */
export function rivals(seasons: SeasonData[], tournaments: readonly Tournament[], memberId: string): Rival[] {
  const cups = cupGames(seasons, tournaments)
  const opponents = new Set<string>()
  const pairings = [...seasons.flatMap((s) => s.games.map((g) => g.participants.map((p) => p.memberId))), ...cups.map((g) => [g.a.ffuId, g.b.ffuId])]
  for (const ids of pairings) {
    if (!ids.includes(memberId)) continue
    for (const id of ids) if (id !== memberId) opponents.add(id)
  }
  const out: Rival[] = []
  for (const opponentId of opponents) {
    const record = pairRecord(seasons, cups, memberId, opponentId)
    const lastMet = lastMeeting(record)
    if (lastMet) out.push({ opponentId, record, games: record.meetings.length, lastMet })
  }
  return out.sort((a, b) => b.games - a.games || meetingOrder(b.lastMet) - meetingOrder(a.lastMet))
}

/** A meeting as one sortable number: year, then week. */
export const meetingOrder = (m: H2HMeeting): number => Number(m.year) * 100 + m.week
