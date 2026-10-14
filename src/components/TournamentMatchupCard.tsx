import { nameForYear } from '@/config'
import type { ResolvedMatchup, ResolvedSide } from '@/selectors/tournament'
import { LEAGUE_STYLES } from './leagues'
import { TeamLink } from './TeamLink'
import { formatPoints } from './format'

/** A slot whose team isn't known yet (a pick'em round before the picks that feed it). */
function OpenRow() {
  return <div className="border-l-2 border-transparent pl-1.5 text-sm italic text-muted">TBD</div>
}

/** The team's seed from the draw, before its name: fixed width, so names line up down a column. */
function Seed({ seed }: { seed: number }) {
  return (
    <span className="w-4 shrink-0 text-right font-mono text-[11px] font-normal tabular-nums text-muted">
      <span className="sr-only">Seed </span>
      {seed}
    </span>
  )
}

/** `linked`: the team opens its profile — not when the whole card is a button (no button in a button).
 *  `winnerTone` replaces the winner's accent bar (the pick'em marks a pick that won or lost). */
function SideRow({ side, year, isWinner, dim, linked, detail, winnerTone = 'border-accent' }: { side: ResolvedSide; year: string; isWinner: boolean; dim: boolean; linked: boolean; detail: string | undefined; winnerTone?: string }) {
  const detailLine = detail && <span className="block truncate font-mono text-[11px] font-normal leading-tight text-muted">{detail}</span>
  return (
    <div className={`flex items-center justify-between gap-2 border-l-2 pl-1.5 ${isWinner ? `${winnerTone} font-semibold` : 'border-transparent'} ${dim ? 'text-muted' : ''}`}>
      <span className="flex min-w-0 items-center gap-1.5">
        {side.seed !== undefined && <Seed seed={side.seed} />}
        <span className={`h-2 w-2 shrink-0 rounded-full ${LEAGUE_STYLES[side.tier].dot}`} aria-hidden />
        <TeamLink ffuId={side.ffuId} logoSize={20} className="gap-1.5" plain={!linked} tight detail={detailLine}>
          <span className="truncate text-sm">{nameForYear(side.ffuId, year) ?? side.ffuId}</span>
        </TeamLink>
      </span>
      <span className="shrink-0 font-mono text-xs tabular-nums">{side.score !== undefined ? formatPoints(side.score) : '—'}</span>
    </div>
  )
}

/** One bracket side or, in a pick'em bracket, a slot not filled yet. */
export type CardSide = ResolvedSide | undefined

/** One bracket matchup: two sides with a tier-color dot, winner highlighted, and under each name
 *  its UPR going into the game (`detail`). Clickable (→ the matchup modal) once there
 *  is a box score to show: the week is on file, or the season is live. The pick'em draws its
 *  bracket with the same card: its `winner` is the pick, and an unknown side reads TBD. */
export function TournamentMatchupCard({ matchup, year, onOpen, detail, winnerTone, label }: {
  matchup: Pick<ResolvedMatchup, 'winner'> & { a: CardSide; b: CardSide }
  year: string
  onOpen?: () => void
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
    <div className="space-y-1">
      {row(a)}
      {row(b)}
    </div>
  )
  const base = 'block w-full border border-border bg-surface p-2 text-left shadow-sm'
  if (onOpen === undefined) return <div className={base}>{body}</div>
  return (
    <button type="button" onClick={onOpen} aria-label={label} className={`${base} cursor-pointer transition-colors hover:border-accent hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}>
      {body}
    </button>
  )
}
