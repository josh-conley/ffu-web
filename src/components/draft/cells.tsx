import type { FC, ReactNode } from 'react'
import { getMember } from '@/config'
import type { DraftPick } from '@/data'
import { pickLabel } from '@/selectors'
import { posBar, posClass, posSolid } from '../positions'
import { cellStateClass, shortName } from './format'
import { PickMeta, PosDot, TradeFold } from './parts'

export interface CellProps {
  pick: DraftPick
  /** Original draft-order owner of this slot (undefined if unknown). */
  ownerId: string | undefined
  numTeams: number
  round: number
  highlighted: string | null
  onToggle: (id: string) => void
}

const isTraded = (p: DraftPick, ownerId: string | undefined) => ownerId !== undefined && p.memberId !== ownerId
const acquirer = (p: DraftPick) => getMember(p.memberId)?.abbreviation ?? '?'

/** Shared pick button: spotlight state, focus ring, trade dog-ear, click-to-highlight-drafter. */
function CellButton({ pick, traded, highlighted, onToggle, className, children }: {
  pick: DraftPick
  traded: boolean
  highlighted: string | null
  onToggle: (id: string) => void
  className: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(pick.memberId)}
      aria-pressed={highlighted === pick.memberId}
      title={pick.player.name}
      className={`relative flex w-full flex-col text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${cellStateClass(highlighted, pick.memberId)} ${className}`}
    >
      {children}
      {traded && <TradeFold />}
    </button>
  )
}

/** Position chip + NFL team, with the "→ acquirer" tag when the pick was traded. */
function PosFooter({ pick, traded }: { pick: DraftPick; traded: boolean }) {
  return (
    <div className="flex items-center justify-between gap-1 text-[10px] text-muted">
      <span className="flex min-w-0 items-center gap-1">
        <span className={`rounded px-1 font-semibold ${posClass(pick.player.position)}`}>{pick.player.position}</span>
        {pick.player.nflTeam && pick.player.position !== 'DEF' && <span className="truncate">{pick.player.nflTeam}</span>}
      </span>
      {traded && <span className="shrink-0 font-bold text-accent">→ {acquirer(pick)}</span>}
    </div>
  )
}

/** SPINE — neutral cell, solid position rail down the left edge; Round 1 gets a ghost overall numeral. */
export const SpineCell: FC<CellProps> = ({ pick, ownerId, numTeams, round, highlighted, onToggle }) => {
  const traded = isTraded(pick, ownerId)
  return (
    <CellButton pick={pick} traded={traded} highlighted={highlighted} onToggle={onToggle} className="gap-1 overflow-hidden bg-surface py-1.5 pl-3 pr-2">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${posSolid(pick.player.position)}`} />
      {round === 1 && (
        <span aria-hidden className="pointer-events-none absolute -bottom-1 right-1 font-mono text-3xl font-black leading-none text-muted/10">{pick.overall}</span>
      )}
      <PickMeta pick={pick} numTeams={numTeams} />
      <div className="truncate font-semibold">{shortName(pick.player)}</div>
      <PosFooter pick={pick} traded={traded} />
    </CellButton>
  )
}

/** BROADCAST — a saturated position-colored chyron bar atop each pick (TV-scoreboard energy). */
export const BroadcastCell: FC<CellProps> = ({ pick, ownerId, numTeams, highlighted, onToggle }) => {
  const traded = isTraded(pick, ownerId)
  return (
    <CellButton pick={pick} traded={traded} highlighted={highlighted} onToggle={onToggle} className="overflow-hidden bg-surface">
      <div className={`flex items-center justify-between px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${posBar(pick.player.position)}`}>
        <span className="font-mono">{pickLabel(pick, numTeams)}</span>
        <span>{pick.player.position}</span>
      </div>
      <div className="flex flex-col gap-0.5 px-2 py-1.5">
        <div className="truncate font-semibold">{shortName(pick.player)}</div>
        <div className="flex items-center justify-between text-[10px] text-muted">
          <span className="truncate">{pick.player.position !== 'DEF' && pick.player.nflTeam ? `${pick.player.nflTeam} · ` : ''}#{pick.overall}</span>
          {traded && <span className="shrink-0 font-bold text-accent">→ {acquirer(pick)}</span>}
        </div>
      </div>
    </CellButton>
  )
}

/** EDITORIAL — restrained, type-led: neutral cell, position reduced to a small color dot + airy spacing. */
export const EditorialCell: FC<CellProps> = ({ pick, ownerId, numTeams, highlighted, onToggle }) => {
  const traded = isTraded(pick, ownerId)
  return (
    <CellButton pick={pick} traded={traded} highlighted={highlighted} onToggle={onToggle} className="gap-1.5 bg-surface p-2.5">
      <PickMeta pick={pick} numTeams={numTeams} />
      <div className="flex items-center gap-1.5 truncate">
        <PosDot position={pick.player.position} />
        <span className="truncate font-semibold">{shortName(pick.player)}</span>
      </div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted">
        <span className="truncate">{pick.player.position}{pick.player.nflTeam && pick.player.position !== 'DEF' ? ` · ${pick.player.nflTeam}` : ''}</span>
        {traded && <span className="shrink-0 font-bold text-accent">→ {acquirer(pick)}</span>}
      </div>
    </CellButton>
  )
}

export type BoardVariant = 'spine' | 'broadcast' | 'editorial' | 'current'
