import { useMemo } from 'react'
import type { Tier } from '@/config'
import { activeMemberIds, careerEfficiency, careerStats, careerUpr, careerWinnings, hasBeenPlayed, type CareerEfficiency, type CareerStats } from '@/selectors'
import { useAllLineups, useCareerData, usePlayers } from './useLeagueData'
import { useYearRange } from './useYearRange'

/**
 * Everything the All-Time Stats table is built from, for one league scope ('ALL' = every league)
 * and the span of years in the URL (see useYearRange; every played year by default).
 *
 * The scope applies to the SEASONS, so the table shows stats earned within that league and those
 * years, not the whole careers of anyone who played in them. Two things deliberately ignore the
 * league: `active` (a current member of the union is current whatever the filter) and the winnings
 * calculation itself (cross-union and cross-league prizes compare every league in a year), which is
 * then cut down to the scoped league's share. Winnings DO follow the years — whole years, which is
 * safe for the same reason: no prize compares across years.
 */
export function useAllTimeStats(league: string) {
  const { seasons, tournaments, loading, error } = useCareerData()
  const years = useMemo(
    () => [...new Set((seasons ?? []).filter(hasBeenPlayed).map((s) => s.year))].sort(),
    [seasons],
  )
  const range = useYearRange(years)
  const { fromYear, toYear } = range
  const inYears = useMemo(() => {
    const within = (year: string) => year >= fromYear && year <= toYear
    return seasons?.filter((s) => within(s.year))
  }, [seasons, fromYear, toYear])
  const scoped = useMemo(
    () => (inYears && league !== 'ALL' ? inYears.filter((s) => s.tier === league) : inYears),
    [inYears, league],
  )
  const careers = useMemo<CareerStats[]>(() => (scoped ? [...careerStats(scoped).values()] : []), [scoped])
  const active = useMemo(() => activeMemberIds(seasons ?? []), [seasons])
  const upr = useMemo(() => (scoped ? careerUpr(scoped) : new Map<string, number>()), [scoped])

  // Lineup efficiency comes from the (Sleeper-era) lineup files, scoped the same way.
  const lineups = useAllLineups()
  const players = usePlayers()
  const eff = useMemo(() => {
    if (!lineups.data || !players.data) return new Map<string, CareerEfficiency>()
    const scopedLineups = lineups.data.filter(
      (l) => (league === 'ALL' || l.tier === league) && l.year >= fromYear && l.year <= toYear,
    )
    return careerEfficiency(scopedLineups, players.data)
  }, [lineups.data, players.data, league, fromYear, toYear])

  const allWinnings = useMemo(() => careerWinnings(inYears ?? [], tournaments), [inYears, tournaments])
  const winnings = useMemo(() => {
    const out = new Map<string, number>()
    for (const [id, w] of allWinnings) out.set(id, league === 'ALL' ? w.total : (w.byTier[league as Tier] ?? 0))
    return out
  }, [allWinnings, league])

  return {
    loaded: seasons !== undefined,
    years,
    range,
    careers,
    active,
    upr,
    eff,
    winnings,
    // Lineups/players gate the spinner (no dash→value flash) but not errors: if they fail, the
    // efficiency column degrades to dashes and the core career table still renders.
    loading: loading || lineups.loading || players.loading,
    error,
  }
}
