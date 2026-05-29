import type { SeasonData } from '@/data'
import type { Tier } from '@/config/types'

// Head-to-head record between two members across any set of seasons (Members page H2H). Includes
// all meetings (regular + playoff); each meeting carries context so the UI can split/label them.

export interface H2HMeeting {
  year: string
  tier: Tier
  week: number
  isPlayoff: boolean
  round?: string
  score: number
  opponentScore: number
  result: 'W' | 'L' | 'T'
}

export interface H2HRecord {
  memberId: string
  opponentId: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  meetings: H2HMeeting[]
}

export function headToHead(seasons: SeasonData[], memberId: string, opponentId: string): H2HRecord {
  const record: H2HRecord = { memberId, opponentId, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0, meetings: [] }

  for (const season of seasons) {
    for (const game of season.games) {
      const me = game.participants.find((p) => p.memberId === memberId)
      const opp = game.participants.find((p) => p.memberId === opponentId)
      if (me === undefined || opp === undefined) continue

      const result = me.score > opp.score ? 'W' : me.score < opp.score ? 'L' : 'T'
      if (result === 'W') record.wins += 1
      else if (result === 'L') record.losses += 1
      else record.ties += 1
      record.pointsFor += me.score
      record.pointsAgainst += opp.score
      record.meetings.push({
        year: season.year,
        tier: season.tier,
        week: game.week,
        isPlayoff: game.isPlayoff,
        round: game.round,
        score: me.score,
        opponentScore: opp.score,
        result,
      })
    }
  }

  return record
}
