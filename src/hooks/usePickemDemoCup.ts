import { useMemo } from 'react'
import { loadDemoCup } from '@/data/pickemDemo'
import { resolveTournament, type SeasonsByTier } from '@/selectors'
import { useAsyncData } from './useAsyncData'

// The preview-only pick'em demo's Cup (data/pickemDemo.ts), resolved against its season's real
// results so the demo leaderboard scores like the real one will.

export function usePickemDemoCup() {
  const { data, loading, error } = useAsyncData('pickem-demo-cup', loadDemoCup)
  const played = useMemo(() => {
    if (!data) return undefined
    const byTier: SeasonsByTier = Object.fromEntries(data.seasons.map((s) => [s.tier, s]))
    return resolveTournament(data.tournament, byTier)
  }, [data])
  return { tournament: data?.tournament, seasons: data?.seasons, played, loading, error }
}
