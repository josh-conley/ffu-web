import type { Tier } from '@/config/types'
import type { SeasonLineups } from '@/data'
import { useLineups, usePlayers } from '@/hooks/useLeagueData'
import { latestLineup, starterPoints } from '@/selectors'
import { BoxScore, type BoxScoreSide } from '../../BoxScore'
import { LoadingSpinner } from '../../LoadingSpinner'

// Both teams' rosters, laid out exactly as the matchup modal's box score (BoxScore): starters slot
// by slot, then the bench. Each is the team's latest lineup on file, read from its own league's
// lineup file, so the points shown are from that week.

function sideOf(lineups: SeasonLineups | null | undefined, ffuId: string): (BoxScoreSide & { week: number }) | undefined {
  const latest = lineups ? latestLineup(lineups, ffuId) : undefined
  return latest && { memberId: ffuId, score: starterPoints(latest.lineup), lineup: latest.lineup, week: latest.week }
}

/** Each team's league lineup file (fetched once per league and shared), read for its latest week. */
function useLatestSides(a: string, b: string, tierOf: ReadonlyMap<string, Tier>, year: string) {
  const lineupsA = useLineups(tierOf.get(a) ?? 'NATIONAL', year)
  const lineupsB = useLineups(tierOf.get(b) ?? 'NATIONAL', year)
  return {
    loading: lineupsA.loading || lineupsB.loading,
    sides: [sideOf(lineupsA.data, a), sideOf(lineupsB.data, b)] as const,
    slots: lineupsA.data?.slots ?? lineupsB.data?.slots,
  }
}

export function PickemRosters({ a, b, tierOf, year }: { a: string; b: string; tierOf: ReadonlyMap<string, Tier>; year: string }) {
  const players = usePlayers()
  const { loading, sides: [sideA, sideB], slots } = useLatestSides(a, b, tierOf, year)
  if (players.loading || loading) return <div className="p-6"><LoadingSpinner /></div>
  if (!sideA || !sideB || !slots) return <p className="border-t border-border p-4 text-sm text-muted">Rosters aren&apos;t on file yet.</p>
  const weeks = sideA.week === sideB.week ? `week ${sideA.week}` : `weeks ${sideA.week} and ${sideB.week}`
  return (
    <section className="border-t border-border">
      <h3 className="bg-surface-2/40 px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-widest text-muted">
        Rosters <span className="font-normal normal-case tracking-normal">· latest lineups ({weeks})</span>
      </h3>
      <BoxScore slots={slots} players={players.data ?? {}} year={year} sides={[sideA, sideB]} heads={false} />
    </section>
  )
}
