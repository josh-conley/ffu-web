import { useMemo } from 'react'
import type { Tier } from '@/config'
import { activeMemberIds, careerEfficiency, careerStats, careerUpr, careerWinnings, type CareerEfficiency, type CareerStats } from '@/selectors'
import { useAllLineups, useCareerData, usePlayers } from './useLeagueData'

/**
 * Everything the All-Time Stats table is built from, for one league scope ('ALL' = every league).
 *
 * The scope applies to the SEASONS, so the table shows stats earned within that league, not the
 * whole careers of anyone who once played in it. Two things deliberately ignore it: `active` (a
 * current member of the union is current whatever the filter) and the winnings calculation itself
 * (cross-union and cross-league prizes compare every league in a year), which is then cut down to
 * the scoped league's share.
 */
export function useAllTimeStats(league: string) {
  const { seasons, tournaments, loading, error } = useCareerData()
  const scoped = useMemo(
    () => (seasons ? (league === 'ALL' ? seasons : seasons.filter((s) => s.tier === league)) : undefined),
    [seasons, league],
  )
  const careers = useMemo<CareerStats[]>(() => (scoped ? [...careerStats(scoped).values()] : []), [scoped])
  const active = useMemo(() => activeMemberIds(seasons ?? []), [seasons])
  const upr = useMemo(() => (scoped ? careerUpr(scoped) : new Map<string, number>()), [scoped])

  // Lineup efficiency comes from the (Sleeper-era) lineup files, scoped the same way.
  const lineups = useAllLineups()
  const players = usePlayers()
  const eff = useMemo(() => {
    if (!lineups.data || !players.data) return new Map<string, CareerEfficiency>()
    const scopedLineups = league === 'ALL' ? lineups.data : lineups.data.filter((l) => l.tier === league)
    return careerEfficiency(scopedLineups, players.data)
  }, [lineups.data, players.data, league])

  const allWinnings = useMemo(() => careerWinnings(seasons ?? [], tournaments), [seasons, tournaments])
  const winnings = useMemo(() => {
    const out = new Map<string, number>()
    for (const [id, w] of allWinnings) out.set(id, league === 'ALL' ? w.total : (w.byTier[league as Tier] ?? 0))
    return out
  }, [allWinnings, league])

  return {
    loaded: seasons !== undefined,
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
