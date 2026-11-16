import { regularSeasonWeeks } from '@/config'
import type { ScheduledGame, SeasonData } from '@/data'
import { upcomingFixtures, winnerOf } from './games'
import { clinchStatuses, type ClinchStatus } from './playoffClinch'
import { playoffSeeding, type SeedRow } from './playoffSeeding'
import { tallyLines, type SeedingResult } from './playoffTiebreak'

// The playoff machine: the season's remaining regular-season fixtures, a winner picked for any of
// them, and the seeding that would follow. Picks carry no scores, so they move records and head to
// head but never points for — a points-for tiebreak is decided on the points already scored.

/** Fixture key → the memberId picked to win it. A fixture with no entry is unpicked. */
export type MachinePicks = Readonly<Record<string, string>>

export interface MachineFixture {
  key: string
  week: number
  memberIds: readonly [string, string]
}

export interface MachineWeek {
  week: number
  fixtures: MachineFixture[]
}

/** Stable for the life of a fixture: week plus both teams, in the schedule's own order. */
export const fixtureKey = (fixture: ScheduledGame): string => `${fixture.week}:${fixture.memberIds.join(':')}`

/** The regular-season weeks still to play, each with its fixtures (playoff weeks excluded). */
export function machineWeeks(season: SeasonData): MachineWeek[] {
  const regular = new Set(regularSeasonWeeks(season.era))
  return upcomingFixtures(season)
    .filter(({ week }) => regular.has(week))
    .map(({ week, fixtures }) => ({
      week,
      fixtures: fixtures.flatMap((f) => {
        const [a, b] = f.memberIds
        return a === undefined || b === undefined ? [] : [{ key: fixtureKey(f), week, memberIds: [a, b] as const }]
      }),
    }))
}

/** The regular-season games already played, as seeding results. */
export function playedResults(season: SeasonData): SeedingResult[] {
  return season.games.flatMap((game) => {
    const [a, b] = game.participants
    if (game.isPlayoff || a === undefined || b === undefined) return []
    return [{ memberIds: [a.memberId, b.memberId] as const, winnerId: winnerOf(game), scores: [a.score, b.score] as const }]
  })
}

/** Picks for fixtures that are still to play; a stale key (its week since played) is ignored. */
export function pickedResults(weeks: readonly MachineWeek[], picks: MachinePicks): SeedingResult[] {
  return weeks.flatMap(({ fixtures }) =>
    fixtures.flatMap((f) => {
      const winnerId = picks[f.key]
      return winnerId !== undefined && f.memberIds.includes(winnerId) ? [{ memberIds: f.memberIds, winnerId }] : []
    }),
  )
}

function resultsWithPicks(season: SeasonData, picks: MachinePicks): SeedingResult[] {
  return [...playedResults(season), ...pickedResults(machineWeeks(season), picks)]
}

/** The seeding as it stands, plus every picked result. With no picks: the current seeding. */
export function projectedSeeding(season: SeasonData, picks: MachinePicks): SeedRow[] {
  return playoffSeeding(season.teams, resultsWithPicks(season, picks))
}

/** The status each team's FINAL seed gives it: exact, since there is nothing left to decide. */
function finalStatuses(rows: readonly SeedRow[]): Map<string, ClinchStatus> {
  return new Map(
    rows.map((r) => [r.memberId, r.bye ? 'bye' : r.divisionWinner ? 'division' : r.inPlayoffs ? 'playoffs' : 'eliminated'] as const),
  )
}

/**
 * What each team has locked up with the picks applied, the unpicked games still open. Once the
 * regular season is really over (no games left, no picks standing in for any), the seeds are final
 * and so are the marks; until then the cautious bounds of playoffClinch.ts. Picks alone never make
 * a seed final: a picked game carries no points, so a points-for tiebreak is still open.
 */
export function projectedClinches(season: SeasonData, picks: MachinePicks): Map<string, ClinchStatus> {
  const weeks = machineWeeks(season)
  if (weeks.length === 0) return finalStatuses(projectedSeeding(season, {}))
  const open = weeks
    .flatMap((w) => w.fixtures)
    .filter((f) => !f.memberIds.includes(picks[f.key] ?? ''))
    .map((f) => f.memberIds)
  return clinchStatuses(tallyLines(season.teams, resultsWithPicks(season, picks)), open)
}

/** Toggles a pick: picking the current pick again clears it. Returns a new object. */
export function togglePick(picks: MachinePicks, key: string, winnerId: string): MachinePicks {
  const { [key]: current, ...rest } = picks
  return current === winnerId ? rest : { ...rest, [key]: winnerId }
}
