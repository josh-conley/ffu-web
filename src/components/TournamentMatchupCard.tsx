import { nameForYear } from '@/config'
import type { ResolvedMatchup, ResolvedSide } from '@/selectors/tournament'
import { LEAGUE_STYLES } from './leagues'
import { TeamLink } from './TeamLink'

/** `linked`: the team opens its profile — not when the whole card is a button (no button in a button). */
function SideRow({ side, year, isWinner, dim, linked }: { side: ResolvedSide; year: string; isWinner: boolean; dim: boolean; linked: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 border-l-2 pl-1.5 ${isWinner ? 'border-accent font-semibold' : 'border-transparent'} ${dim ? 'text-muted' : ''}`}>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${LEAGUE_STYLES[side.tier].dot}`} aria-hidden />
        <TeamLink ffuId={side.ffuId} logoSize={20} className="gap-1.5" plain={!linked} tight>
          <span className="truncate text-sm">{nameForYear(side.ffuId, year) ?? side.ffuId}</span>
        </TeamLink>
      </span>
      <span className="shrink-0 font-mono text-xs tabular-nums">{side.score !== undefined ? side.score.toFixed(2) : '—'}</span>
    </div>
  )
}

/** One bracket matchup: two sides with a tier-color dot, winner highlighted. Clickable (→ box score)
 *  only once both sides have a score. */
export function TournamentMatchupCard({ matchup, year, onOpen }: { matchup: ResolvedMatchup; year: string; onOpen?: () => void }) {
  const { a, b, winner } = matchup
  const body = (
    <div className="space-y-1">
      <SideRow side={a} year={year} isWinner={winner === a.ffuId} dim={winner !== undefined && winner !== a.ffuId} linked={!onOpen} />
      <SideRow side={b} year={year} isWinner={winner === b.ffuId} dim={winner !== undefined && winner !== b.ffuId} linked={!onOpen} />
    </div>
  )
  const base = 'block w-full border border-border bg-surface p-2 text-left shadow-sm'
  if (onOpen === undefined) return <div className={base}>{body}</div>
  return (
    <button type="button" onClick={onOpen} className={`${base} cursor-pointer transition-colors hover:border-accent hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}>
      {body}
    </button>
  )
}
