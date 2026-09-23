import type { Game } from '@/data'
import type { Tier } from '@/config'
import { useLineups, usePlayers } from '@/hooks/useLeagueData'
import { gameLineups, scoreFor } from '@/selectors'
import { BoxScore, type BoxScoreSide } from './BoxScore'
import { LineupModalFrame } from './LineupModalFrame'
import { LoadingSpinner } from './LoadingSpinner'

/** Modal showing both starting lineups (+ bench) for a single-tier game, lazy-loading that tier's
 *  lineups on open. The head-to-head body itself lives in the reusable BoxScore component. */
export function LineupModal({ tier, year, game, onClose }: { tier: Tier; year: string; game: Game; onClose: () => void }) {
  const lineups = useLineups(tier, year)
  const players = usePlayers()
  const data = lineups.data
  const loading = lineups.loading || players.loading
  const memberIds = game.participants.map((p) => p.memberId)
  const teams = data ? gameLineups(data, game.week, memberIds) : []
  const sides = teams.map((lineup): BoxScoreSide => ({ memberId: lineup.memberId, score: scoreFor(game, lineup.memberId) ?? 0, lineup }))
  const [sideA, sideB] = sides

  return (
    <LineupModalFrame title={`Week ${game.week}${game.round ? ` · ${game.round}` : ''}`} memberIds={memberIds} onClose={onClose}>
      {loading ? (
        <div className="p-10"><LoadingSpinner /></div>
      ) : data && sideA && sideB ? (
        <BoxScore slots={data.slots} players={players.data ?? {}} year={year} sides={[sideA, sideB]} />
      ) : (
        <p className="p-6 text-sm text-muted">Lineups aren't available for this game.</p>
      )}
    </LineupModalFrame>
  )
}
