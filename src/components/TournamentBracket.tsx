import type { ReactNode } from 'react'
import { nameForYear } from '@/config'
import type { FormOf } from '@/hooks/useFormGoingInto'
import { cupGameSource } from '@/selectors'
import type { ResolvedRound, ResolvedSide, ResolvedTournament } from '@/selectors/tournament'
import { TournamentMatchupCard } from './TournamentMatchupCard'
import { uprLabel } from './format'

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

/** One round's column: its name and week over the matchups, which space out evenly down the column
 *  so later rounds center against earlier ones. Shared with the pick'em bracket. */
export function RoundShell({ label, week, note, children }: { label: string; week: number; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex w-60 shrink-0 flex-col">
      <header className="mb-3 flex items-baseline justify-between border-b-2 border-accent pb-1">
        <h2 className="text-xs font-bold uppercase tracking-wide text-text">{label}</h2>
        <span className="text-[10px] font-semibold uppercase text-muted">Week {week}</span>
      </header>
      {note}
      <div className="flex flex-1 flex-col justify-around gap-3">{children}</div>
    </section>
  )
}

/** The bracket's frame: columns left → right, horizontally scrollable. Shared with the pick'em. */
export function BracketFrame({ children }: { children: ReactNode }) {
  return (
    // Full-bleed: break out of the page's centered max-width so the wide bracket has room. The inner
    // box is `w-fit` + `mx-auto`, so it stays centered when it fits and only scrolls once it can't
    // (same viewport-breakout + center trick as the Stats table).
    <div className="mx-[calc(50%-50vw+1rem)]">
      <div className="mx-auto w-fit max-w-full overflow-x-auto pb-4">
        <div className="flex min-w-max items-stretch gap-4 px-1">{children}</div>
      </div>
    </div>
  )
}

function RoundColumn({ round, year, onOpen, formOf }: { round: ResolvedRound; year: string; onOpen: (m: OpenMatchup) => void; formOf?: FormOf }) {
  const detail = formOf && ((ffuId: string) => uprLabel(formOf(ffuId, round.week)))
  return (
    <RoundShell label={round.label} week={round.week} note={round.dropped.length > 0 && <DroppedNote dropped={round.dropped} year={year} />}>
      {round.matchups.length === 0 ? (
        <p className="text-xs italic text-muted">Awaiting results</p>
      ) : (
        round.matchups.map((m, i) => (
          <TournamentMatchupCard
            key={i}
            matchup={m}
            year={year}
            onOpen={cupGameSource(year, m.a, m.b) ? () => onOpen({ round, matchupIndex: i }) : undefined}
            detail={detail}
          />
        ))
      )}
    </RoundShell>
  )
}

/** The full bracket: one column per round, left → right, horizontally scrollable. Columns stretch to
 *  equal height and space their matchups evenly, so later (smaller) rounds visually center against the
 *  earlier ones — the classic bracket read. */
export function TournamentBracket({ tournament, year, onOpen, formOf }: {
  tournament: ResolvedTournament
  year: string
  onOpen: (m: OpenMatchup) => void
  /** Each team's UPR going into a round, shown under its name. */
  formOf?: FormOf
}) {
  return (
    <BracketFrame>
      {tournament.rounds.map((round) => (
        <RoundColumn key={round.key} round={round} year={year} onOpen={onOpen} formOf={formOf} />
      ))}
    </BracketFrame>
  )
}
