import { nameForYear } from '@/config'
import type { ResolvedRound, ResolvedSide, ResolvedTournament } from '@/selectors/tournament'
import { TournamentMatchupCard } from './TournamentMatchupCard'

export interface OpenMatchup {
  round: ResolvedRound
  matchupIndex: number
}

function DroppedNote({ dropped, year }: { dropped: ResolvedSide[]; year: string }) {
  return (
    <p className="mb-2 border-l-2 border-national pl-2 text-[11px] leading-tight text-muted">
      Dropped (lowest winner):{' '}
      <span className="font-semibold">{dropped.map((d) => nameForYear(d.ffuId, year) ?? d.ffuId).join(', ')}</span>
    </p>
  )
}

function RoundColumn({ round, year, onOpen }: { round: ResolvedRound; year: string; onOpen: (m: OpenMatchup) => void }) {
  return (
    <section className="flex w-60 shrink-0 flex-col">
      <header className="mb-3 flex items-baseline justify-between border-b-2 border-accent pb-1">
        <h2 className="text-xs font-bold uppercase tracking-wide text-text">{round.label}</h2>
        <span className="text-[10px] font-semibold uppercase text-muted">Week {round.week}</span>
      </header>
      {round.dropped.length > 0 && <DroppedNote dropped={round.dropped} year={year} />}
      <div className="flex flex-1 flex-col justify-around gap-3">
        {round.matchups.length === 0 ? (
          <p className="text-xs italic text-muted">Awaiting results</p>
        ) : (
          round.matchups.map((m, i) => {
            const hasScores = m.a.score !== undefined && m.b.score !== undefined
            return (
              <TournamentMatchupCard
                key={i}
                matchup={m}
                year={year}
                onOpen={hasScores ? () => onOpen({ round, matchupIndex: i }) : undefined}
              />
            )
          })
        )}
      </div>
    </section>
  )
}

/** The full bracket: one column per round, left → right, horizontally scrollable. Columns stretch to
 *  equal height and space their matchups evenly, so later (smaller) rounds visually center against the
 *  earlier ones — the classic bracket read. */
export function TournamentBracket({ tournament, year, onOpen }: { tournament: ResolvedTournament; year: string; onOpen: (m: OpenMatchup) => void }) {
  return (
    // Full-bleed: break out of the page's centered max-width so the wide bracket has room (same
    // viewport-breakout trick as DraftBoard / the Stats table).
    <div className="mx-[calc(50%-50vw+1rem)] overflow-x-auto pb-4">
      <div className="flex min-w-max items-stretch gap-4 px-1">
        {tournament.rounds.map((round) => (
          <RoundColumn key={round.key} round={round} year={year} onOpen={onOpen} />
        ))}
      </div>
    </div>
  )
}
