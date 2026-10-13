import { cupGameSource, type CupGameSide } from '@/selectors'
import { LeagueBadge } from '../LeagueBadge'
import { LineupModalFrame } from '../LineupModalFrame'
import { LiveLineupModal } from '../LiveLineupModal'
import { StaticBoxScoreBody } from '../StaticBoxScoreBody'

/** One Cup game to open: the round it belongs to and its two teams. */
export interface CupGame {
  year: string
  week: number
  /** The round's name ("Round of 36"), for the title bar. */
  label: string
  a: CupGameSide
  b: CupGameSide
}

/** "Round of 36 · Week 6", then each team's league, since a Cup game can cross them. */
function Title({ game, live }: { game: CupGame; live: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>
        {game.label} · Week {game.week}
        {live && ' · Live'}
      </span>
      <span className="inline-flex gap-1 normal-case">
        <LeagueBadge tier={game.a.tier} />
        <LeagueBadge tier={game.b.tier} />
      </span>
    </span>
  )
}

/**
 * A Cup game's matchup modal: the same modal as a league game's (lineups, bench, the pair's series,
 * each team's profile), with each team's lineup read from its own league. Finished weeks read the
 * season's lineup files; the live season's other weeks read Sleeper, as the home page does.
 */
export function CupMatchupModal({ game, onClose }: { game: CupGame; onClose: () => void }) {
  const { year, week, a, b } = game
  const source = cupGameSource(year, a, b)
  const memberIds: [string, string] = [a.ffuId, b.ffuId]
  if (source?.kind === 'live') {
    return <LiveLineupModal leagueIds={source.leagueIds} year={year} week={week} memberIds={memberIds} title={<Title game={game} live />} onClose={onClose} />
  }
  return (
    <LineupModalFrame title={<Title game={game} live={false} />} memberIds={memberIds} onClose={onClose}>
      {source ? (
        <StaticBoxScoreBody
          year={year}
          week={week}
          sides={[
            { memberId: a.ffuId, tier: a.tier, score: source.scores[0] },
            { memberId: b.ffuId, tier: b.tier, score: source.scores[1] },
          ]}
        />
      ) : (
        <p className="p-6 text-sm text-muted">This game hasn&apos;t been played yet.</p>
      )}
    </LineupModalFrame>
  )
}
