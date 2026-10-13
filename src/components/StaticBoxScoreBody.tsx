import type { SeasonLineups } from '@/data'
import type { Tier } from '@/config'
import { useLineups, usePlayers } from '@/hooks/useLeagueData'
import { gameLineups } from '@/selectors'
import { BoxScore, type BoxScoreSide } from './BoxScore'
import { LoadingSpinner } from './LoadingSpinner'

/** One team in a finished game: who, the league whose lineup file holds their week, and their score. */
export interface StaticSide {
  memberId: string
  tier: Tier
  score: number
}

function boxSide(side: StaticSide, data: SeasonLineups | null | undefined, week: number): BoxScoreSide | undefined {
  if (!data) return undefined
  const [lineup] = gameLineups(data, week, [side.memberId])
  return lineup && { memberId: side.memberId, score: side.score, lineup }
}

/**
 * A finished game's box score, from the season's lineup files. Each side's lineup is read from its
 * OWN tier's file, so the same body serves a league game (both sides one tier, one file) and a Cup
 * game (two tiers, two files; the roster slots are the same in every tier). Lazy-loads on open.
 */
export function StaticBoxScoreBody({ year, week, sides: [a, b] }: { year: string; week: number; sides: readonly [StaticSide, StaticSide] }) {
  const players = usePlayers()
  const lineupsA = useLineups(a.tier, year)
  const lineupsB = useLineups(b.tier, year)
  if (players.loading || lineupsA.loading || lineupsB.loading) return <div className="p-10"><LoadingSpinner /></div>

  const sideA = boxSide(a, lineupsA.data, week)
  const sideB = boxSide(b, lineupsB.data, week)
  const slots = lineupsA.data?.slots ?? lineupsB.data?.slots
  if (!sideA || !sideB || !slots) return <p className="p-6 text-sm text-muted">Lineups aren&apos;t available for this game.</p>
  return <BoxScore slots={slots} players={players.data ?? {}} year={year} sides={[sideA, sideB]} />
}
