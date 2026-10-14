import { nameForYear } from '@/config'
import { cupGameSource, type RoundOutline } from '@/selectors'
import type { ResolvedRound, ResolvedTournament } from '@/selectors/tournament'
import { TournamentMatchupCard } from './TournamentMatchupCard'
import { EmptySlot, WingedBracket } from './WingedBracket'

export interface OpenMatchup {
  round: ResolvedRound
  matchupIndex: number
}

/** The lowest-winner drop, over the final: it culls one team from the whole round, not one side. */
function DroppedNote({ round, year }: { round: ResolvedRound; year: string }) {
  return (
    <p className="mb-2 border-l-2 border-national pl-2 text-[11px] leading-tight text-muted">
      Dropped (lowest {round.label} winner):{' '}
      <span className="font-semibold">{round.dropped.map((d) => nameForYear(d.ffuId, year) ?? d.ffuId).join(', ')}</span>
    </p>
  )
}

/** The played bracket, two-sided (WingedBracket). A round not paired yet shows the outline's empty
 *  slots, so the bracket keeps its full shape from the draw to the final. */
export function TournamentBracket({ tournament, year, onOpen, outline }: {
  tournament: ResolvedTournament
  year: string
  onOpen: (m: OpenMatchup) => void
  /** The bracket's shape, for the empty slots of rounds not paired yet. */
  outline?: RoundOutline[]
}) {
  const drops = tournament.rounds.filter((r) => r.dropped.length > 0)
  const rounds = tournament.rounds.map((round, r) => {
    const slots =
      round.matchups.length === 0
        ? Array.from({ length: outline?.[r]?.matchups ?? 1 }, (_, i) => <EmptySlot key={i} />)
        : round.matchups.map((m, i) => (
            <TournamentMatchupCard
              key={i}
              matchup={m}
              year={year}
              onOpen={cupGameSource(year, m.a, m.b) ? () => onOpen({ round, matchupIndex: i }) : undefined}
            />
          ))
    return { key: round.key, label: round.label, week: round.week, slots }
  })
  return (
    <WingedBracket
      rounds={rounds}
      label={`${tournament.name} bracket`}
      center={drops.length > 0 && drops.map((round) => <DroppedNote key={round.key} round={round} year={year} />)}
    />
  )
}
