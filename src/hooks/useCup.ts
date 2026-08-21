import { useMemo } from 'react'
import type { Tournament } from '@/data'
import {
  outlineTournament,
  resolveTournament,
  type ResolvedTournament,
  type RoundOutline,
  type SeasonsByTier,
} from '@/selectors'
import { useSeason, useTournament } from './useLeagueData'

// Loads a season's Cup and puts it in one of two states:
//   • undrawn — rounds and weeks are published, the field is not. The page shows the outline.
//   • drawn   — participants exist, so the bracket resolves against the three tiers' season data.
// The tier fetches are gated on `drawn` so a pre-draw season (whose tier files may not exist yet,
// because the season is still live) never triggers a failing load.

export interface CupView {
  tournament: Tournament | undefined
  /** The bracket's shape — always available, drawn or not. */
  outline: RoundOutline[]
  /** The played bracket. Undefined until the draw has been held. */
  resolved: ResolvedTournament | undefined
  drawn: boolean
  loading: boolean
  error: Error | undefined
}

export function useCup(year: string): CupView {
  const cup = useTournament(year)
  const tournament = cup.data ?? undefined
  const drawn = (tournament?.participants.length ?? 0) > 0

  const premier = useSeason('PREMIER', year, drawn)
  const masters = useSeason('MASTERS', year, drawn)
  const national = useSeason('NATIONAL', year, drawn)

  const outline = useMemo(() => (tournament ? outlineTournament(tournament) : []), [tournament])

  const resolved = useMemo(() => {
    if (!tournament || !drawn) return undefined
    const seasonsByTier: SeasonsByTier = {}
    if (premier.data) seasonsByTier.PREMIER = premier.data
    if (masters.data) seasonsByTier.MASTERS = masters.data
    if (national.data) seasonsByTier.NATIONAL = national.data
    return resolveTournament(tournament, seasonsByTier)
  }, [tournament, drawn, premier.data, masters.data, national.data])

  const tiersLoading = drawn && (premier.loading || masters.loading || national.loading)
  return {
    tournament,
    outline,
    resolved,
    drawn,
    loading: cup.loading || tiersLoading,
    error: cup.error ?? premier.error ?? masters.error ?? national.error,
  }
}
