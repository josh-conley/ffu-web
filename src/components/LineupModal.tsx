import type { Game } from '@/data'
import type { Tier } from '@/config'
import { LineupModalFrame } from './LineupModalFrame'
import { StaticBoxScoreBody, type StaticSide } from './StaticBoxScoreBody'

/** Modal showing both starting lineups (+ bench) for a single-tier game from a season's files. */
export function LineupModal({ tier, year, game, onClose }: { tier: Tier; year: string; game: Game; onClose: () => void }) {
  const memberIds = game.participants.map((p) => p.memberId)
  const [a, b] = game.participants.map((p): StaticSide => ({ memberId: p.memberId, tier, score: p.score }))

  return (
    <LineupModalFrame title={`Week ${game.week}${game.round ? ` · ${game.round}` : ''}`} memberIds={memberIds} onClose={onClose}>
      {a && b ? (
        <StaticBoxScoreBody year={year} week={game.week} sides={[a, b]} />
      ) : (
        <p className="p-6 text-sm text-muted">Lineups aren&apos;t available for this game.</p>
      )}
    </LineupModalFrame>
  )
}
