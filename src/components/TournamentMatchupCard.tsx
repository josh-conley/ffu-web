import { nameForYear } from '@/config'
import type { ResolvedMatchup, ResolvedSide } from '@/selectors/tournament'
import { LEAGUE_STYLES } from './leagues'
import { TeamLogo } from './TeamLogo'

function SideRow({ side, year, isWinner, dim }: { side: ResolvedSide; year: string; isWinner: boolean; dim: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 border-l-2 pl-1.5 ${isWinner ? 'border-accent font-semibold' : 'border-transparent'} ${dim ? 'text-muted' : ''}`}>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${LEAGUE_STYLES[side.tier].dot}`} aria-hidden />
        <TeamLogo ffuId={side.ffuId} size={20} />
        <span className="truncate text-sm">{nameForYear(side.ffuId, year) ?? side.ffuId}</span>
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
      <SideRow side={a} year={year} isWinner={winner === a.ffuId} dim={winner !== undefined && winner !== a.ffuId} />
      <SideRow side={b} year={year} isWinner={winner === b.ffuId} dim={winner !== undefined && winner !== b.ffuId} />
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
