import type { ReactNode } from 'react'
import { getMember } from '@/config'
import type { DraftPick } from '@/data'
import { pickLabel } from '@/selectors'
import { posBar } from '../positions'
import { cellStateClass, shortName } from './format'
import { TradeFold } from './parts'

export interface CellProps {
  pick: DraftPick
  /** Original draft-order owner of this slot (undefined if unknown). */
  ownerId: string | undefined
  numTeams: number
  highlighted: string | null
  onToggle: (id: string) => void
}

const isTraded = (p: DraftPick, ownerId: string | undefined) => ownerId !== undefined && p.memberId !== ownerId
const acquirer = (p: DraftPick) => getMember(p.memberId)?.abbreviation ?? '?'

/** Shared pick button: spotlight state, focus ring, trade dog-ear, click-to-highlight-drafter. */
function CellButton({ pick, traded, highlighted, onToggle, children }: {
  pick: DraftPick
  traded: boolean
  highlighted: string | null
  onToggle: (id: string) => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(pick.memberId)}
      aria-pressed={highlighted === pick.memberId}
      title={pick.player.name}
      className={`relative flex w-full flex-col overflow-hidden bg-surface text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${cellStateClass(highlighted, pick.memberId)}`}
    >
      {children}
      {traded && <TradeFold />}
    </button>
  )
}

/**
 * A draft pick as a broadcast nameplate: a saturated position-colored chyron (pick coordinate +
 * position) above the player's name. The footer carries the NFL team and either the overall pick
 * number or, for a traded pick, the acquiring team. Click to spotlight every pick that drafter made.
 */
export function PickCell({ pick, ownerId, numTeams, highlighted, onToggle }: CellProps) {
  const traded = isTraded(pick, ownerId)
  const { player } = pick
  return (
    <CellButton pick={pick} traded={traded} highlighted={highlighted} onToggle={onToggle}>
      <div className={`flex items-center justify-between gap-1 px-1.5 py-0.5 ${posBar(player.position)}`}>
        <span className="font-mono text-[10px] font-bold tabular-nums">{pickLabel(pick, numTeams)}</span>
        <span className="text-[10px] font-extrabold uppercase tracking-wide">{player.position}</span>
      </div>
      <div className="flex flex-col gap-0.5 px-2 py-1.5">
        <span className="truncate text-xs font-bold leading-tight tracking-tight">{shortName(player)}</span>
        <span className="flex items-center justify-between gap-1 font-mono text-[9px] uppercase tracking-wide text-muted">
          <span className="truncate">{player.position !== 'DEF' && player.nflTeam ? player.nflTeam : ''}</span>
          {traded ? (
            <span className="shrink-0 font-bold text-accent">→ {acquirer(pick)}</span>
          ) : (
            <span className="shrink-0 tabular-nums">#{pick.overall}</span>
          )}
        </span>
      </div>
    </CellButton>
  )
}
