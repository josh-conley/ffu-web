import { nameForYear } from '@/config'
import type { ResolvedMatchup, ResolvedSide } from '@/selectors/tournament'
import { LEAGUE_STYLES } from './leagues'
import { TeamNameButton } from './TeamLink'
import { formatPoints } from './format'

// One bracket matchup, kept to the standard bracket line: seed, team, score, with the team's UPR
// going in as a small line under its name. No logo, so the full team name fits (it wraps rather
// than truncating when a column is narrow). The record is in the matchup modal.

const ROW = 'flex items-start gap-1 border-l-2 py-px pl-1 text-xs leading-tight'

/** A slot whose team isn't known yet (a pick'em round before the picks that feed it). */
function OpenRow() {
  return <div className={`${ROW} border-transparent italic text-muted`}>TBD</div>
}

/** `linked`: the name opens the team's profile — not when the whole card is a button (no button in
 *  a button). `winnerTone` replaces the winner's accent bar (the pick'em marks a pick that won or lost). */
function SideRow({ side, year, isWinner, dim, linked, detail, winnerTone = 'border-accent' }: { side: ResolvedSide; year: string; isWinner: boolean; dim: boolean; linked: boolean; detail: string | undefined; winnerTone?: string }) {
  const name = nameForYear(side.ffuId, year) ?? side.ffuId
  return (
    <div className={`${ROW} ${isWinner ? `${winnerTone} font-semibold` : 'border-transparent'} ${dim ? 'text-muted' : ''}`}>
      {side.seed !== undefined && (
        <span className="w-3 shrink-0 text-right text-[10px] font-normal tabular-nums text-muted">
          <span className="sr-only">Seed </span>
          {side.seed}
        </span>
      )}
      <span className={`mt-[0.3rem] h-1.5 w-1.5 shrink-0 rounded-full ${LEAGUE_STYLES[side.tier].dot}`} aria-hidden />
      <span className="min-w-0 flex-1 break-words">
        {linked ? <TeamNameButton ffuId={side.ffuId} tight>{name}</TeamNameButton> : name}
        {detail && <span className="block font-mono text-[10px] font-normal text-muted">{detail}</span>}
      </span>
      {side.score !== undefined && <span className="shrink-0 font-mono text-[11px] tabular-nums">{formatPoints(side.score)}</span>}
    </div>
  )
}

/** One bracket side or, in a pick'em bracket, a slot not filled yet. */
export type CardSide = ResolvedSide | undefined

/** One bracket matchup: two sides with a tier-color dot, the winner highlighted, each team's UPR
 *  going in under its name (`detail`). Clickable (→ the
 *  matchup modal) once there is a box score to show: the week is on file, or the season is live.
 *  The pick'em draws its bracket with the same card: its `winner` is the pick, and an unknown side
 *  reads TBD. */
export function TournamentMatchupCard({ matchup, year, onOpen, detail, winnerTone, label }: {
  matchup: Pick<ResolvedMatchup, 'winner'> & { a: CardSide; b: CardSide }
  year: string
  onOpen?: () => void
  /** A small line under a team's name: its UPR going into the game. */
  detail?: (ffuId: string) => string | undefined
  winnerTone?: string
  /** Accessible name when the card is a button. */
  label?: string
}) {
  const { a, b, winner } = matchup
  const row = (side: CardSide) =>
    side ? (
      <SideRow side={side} year={year} isWinner={winner === side.ffuId} dim={winner !== undefined && winner !== side.ffuId} linked={!onOpen} detail={detail?.(side.ffuId)} winnerTone={winnerTone} />
    ) : (
      <OpenRow />
    )
  const body = (
    <div className="space-y-0.5">
      {row(a)}
      {row(b)}
    </div>
  )
  const base = 'block w-full border border-border bg-surface px-1 py-1 text-left'
  if (onOpen === undefined) return <div className={base}>{body}</div>
  return (
    <button type="button" onClick={onOpen} aria-label={label} className={`${base} cursor-pointer transition-colors hover:border-accent hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}>
      {body}
    </button>
  )
}
