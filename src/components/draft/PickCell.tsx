import type { ReactNode } from 'react'
import { FaArrowRightArrowLeft } from 'react-icons/fa6'
import { getMember } from '@/config'
import type { DraftPick } from '@/data'
import { pickLabel } from '@/selectors'
import { posBar, posTint } from '../positions'
import { cellStateClass, shortName } from './format'

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

/** Shared pick button: spotlight state, focus ring, click-to-highlight-drafter. */
function CellButton({ pick, tone, highlighted, onToggle, children }: {
  pick: DraftPick
  /** Pale position tint (background only) applied to the whole card; text stays the default color. */
  tone: string
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
      className={`relative flex w-full flex-col overflow-hidden text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${tone} ${cellStateClass(highlighted, pick.memberId)}`}
    >
      {children}
    </button>
  )
}

/**
 * A draft pick as a broadcast nameplate: the whole card is tinted its position color, with a
 * saturated chyron (pick coordinate + position) above the player's name. The footer is a 3-column
 * row — NFL team (left), a centered swap icon + acquiring team when the pick was traded, and the
 * overall pick number (always, right). Click to spotlight that drafter's picks.
 */
export function PickCell({ pick, ownerId, numTeams, highlighted, onToggle }: CellProps) {
  const traded = isTraded(pick, ownerId)
  const { player } = pick
  return (
    <CellButton pick={pick} tone={posTint(player.position)} highlighted={highlighted} onToggle={onToggle}>
      <div className={`flex items-center justify-between gap-1 px-1.5 py-0.5 ${posBar(player.position)}`}>
        <span className="font-mono text-[10px] font-bold tabular-nums">{pickLabel(pick, numTeams)}</span>
        <span className="text-[10px] font-extrabold uppercase tracking-wide">{player.position}</span>
      </div>
      <div className="flex flex-col gap-0.5 px-2 py-1.5">
        <span className="truncate text-xs font-bold leading-tight tracking-tight">{shortName(player)}</span>
        <span className="grid grid-cols-3 items-center gap-1 font-mono text-[9px] uppercase tracking-wide text-muted sm:text-[11px]">
          <span className="truncate">{player.position !== 'DEF' && player.nflTeam ? player.nflTeam : ''}</span>
          {traded ? (
            <span className="flex items-center justify-center gap-1 font-bold text-accent" title={`Traded to ${acquirer(pick)}`}>
              <FaArrowRightArrowLeft className="text-[8px] sm:text-[9px]" aria-label="Traded pick" />
              {acquirer(pick)}
            </span>
          ) : (
            <span aria-hidden />
          )}
          <span className="justify-self-end tabular-nums">#{pick.overall}</span>
        </span>
      </div>
    </CellButton>
  )
}
