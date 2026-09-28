import type { SeasonData } from '@/data'
import { runningRecords, type WeekRecord } from './games'

// How often a record after N weeks has ended in the playoffs, across every finished season: "teams
// at 2-1 after 3 weeks made it 58 of 83 times". A plain count of what happened — no model, no
// simulation — so it reads as history, not as a forecast for this team.
//
// "Made the playoffs" is having played in the championship bracket, which is how every era's data
// records it (ESPN's and Sleeper's brackets differ in shape, not in that).

export interface BaseRate {
  made: number
  total: number
}

export interface PlayoffBaseRates {
  week: number
  /** Earliest season counted — the "since" in the sentence. Absent when nothing was counted. */
  since?: string
  byRecord: Map<string, BaseRate>
}

/** The key a record is counted under: 2-1, or 2-0-1 with a tie. */
export function recordKey(r: WeekRecord): string {
  return r.ties > 0 ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`
}

function playoffTeams(season: SeasonData): Set<string> {
  return new Set(season.games.filter((g) => g.bracket === 'championship').flatMap((g) => g.participants.map((p) => p.memberId)))
}

const finished = (s: SeasonData) => s.teams.length > 0 && s.teams.every((t) => t.finalPlacement !== undefined)

export function playoffBaseRates(seasons: readonly SeasonData[], week: number): PlayoffBaseRates {
  const byRecord = new Map<string, BaseRate>()
  const counted = seasons.filter(finished)
  for (const season of counted) {
    const made = playoffTeams(season)
    for (const [memberId, weeks] of runningRecords(season)) {
      const record = weeks.get(week)
      if (record === undefined) continue
      const key = recordKey(record)
      const rate = byRecord.get(key) ?? { made: 0, total: 0 }
      byRecord.set(key, { made: rate.made + (made.has(memberId) ? 1 : 0), total: rate.total + 1 })
    }
  }
  const since = counted.map((s) => s.year).sort()[0]
  return since === undefined ? { week, byRecord } : { week, since, byRecord }
}
