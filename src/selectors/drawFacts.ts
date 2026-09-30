import type { Tier } from '@/config'
import type { SeasonData, TeamRecord } from '@/data'
import { memberSeasons } from './career'
import { regularSeasonStandings } from './standings'

// The "on the clock" facts for a team at the Cup draw: what the commissioner talks over while a
// team waits to draw. All derived from the season files — this season so far (the in-progress
// year is refreshed weekly), last season's finish and whether it moved them up or down, and titles.

export interface DrawFacts {
  /** The draw year's season so far, if they have played in it. */
  thisSeason?: { tier: Tier; record: TeamRecord; rank: number; size: number }
  /** The season before, if they played it. */
  lastSeason?: { year: string; tier: Tier; place: number | undefined; size: number; move?: 'promoted' | 'relegated' }
  /** Championships (a final placement of 1) in any league. */
  titles: number
  /** FFU seasons played, counting the draw year. */
  seasons: number
}

export function drawFacts(seasons: SeasonData[], ffuId: string, year: string): DrawFacts {
  const history = memberSeasons(seasons, ffuId)
  const now = history.find((s) => s.year === year)
  const prev = history.find((s) => s.year === String(Number(year) - 1))
  const seasonOf = (y: string, tier: Tier) => seasons.find((s) => s.year === y && s.tier === tier)

  const nowSeason = now && seasonOf(now.year, now.tier)
  const nowRow = nowSeason && regularSeasonStandings(nowSeason).find((r) => r.team.memberId === ffuId)
  const prevSeason = prev && seasonOf(prev.year, prev.tier)

  return {
    ...(now && nowSeason && nowRow && {
      thisSeason: { tier: now.tier, record: now.team.record, rank: nowRow.rank, size: nowSeason.teams.length },
    }),
    ...(prev && prevSeason && {
      lastSeason: {
        year: prev.year,
        tier: prev.tier,
        place: prev.team.finalPlacement,
        size: prevSeason.teams.length,
        ...(prev.team.promoted ? { move: 'promoted' as const } : prev.team.relegated ? { move: 'relegated' as const } : {}),
      },
    }),
    titles: history.filter((s) => s.team.finalPlacement === 1).length,
    seasons: history.length,
  }
}
