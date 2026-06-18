import { useState, type FC } from 'react'
import type { DraftData, DraftPick } from '@/data'
import { teamsBySlot } from '@/selectors'
import { LEAGUE_STYLES } from '../leagues'
import { BroadcastCell, EditorialCell, SpineCell, type BoardVariant, type CellProps } from './cells'
import { PositionLegend, RoundLabel, TeamHeader } from './parts'

/** The redesigned cell renderers, keyed by variant ('current' uses the legacy DraftBoard instead). */
const CELLS: Record<Exclude<BoardVariant, 'current'>, FC<CellProps>> = {
  spine: SpineCell,
  broadcast: BroadcastCell,
  editorial: EditorialCell,
}

type Cell = FC<CellProps>

/** Team column headers (clickable to spotlight), with a sticky-left "Rd" corner over the round rail. */
function HeaderRow({ slots, teamBySlot, year, highlighted, onToggle }: {
  slots: number[]
  teamBySlot: Map<number, string>
  year: string
  highlighted: string | null
  onToggle: (id: string) => void
}) {
  return (
    <tr>
      <th className="sticky left-0 z-20 border-b-2 border-r border-border bg-surface-2 px-0.5 py-1 text-center text-[9px] font-bold uppercase tracking-wider text-muted sm:px-1">
        Rd
      </th>
      {slots.map((slot) => (
        <TeamHeader key={slot} slot={slot} ownerId={teamBySlot.get(slot)} year={year} highlighted={highlighted} onToggle={onToggle} />
      ))}
    </tr>
  )
}

/** One row per round: a tier-tinted round-rail label, then a pick cell (the chosen variant) per slot. */
function BodyRows({ rounds, slots, byCell, teamBySlot, numTeams, tier, Cell, highlighted, onToggle }: {
  rounds: number[]
  slots: number[]
  byCell: Map<string, DraftPick>
  teamBySlot: Map<number, string>
  numTeams: number
  tier: (typeof LEAGUE_STYLES)[keyof typeof LEAGUE_STYLES]
  Cell: Cell
  highlighted: string | null
  onToggle: (id: string) => void
}) {
  return (
    <>
      {rounds.map((round) => (
        <tr key={round}>
          <RoundLabel round={round} tier={tier} />
          {slots.map((slot) => {
            const pick = byCell.get(`${round}-${slot}`)
            return (
              <td key={slot} className="p-0.5 align-top">
                {pick && (
                  <Cell pick={pick} ownerId={teamBySlot.get(slot)} numTeams={numTeams} round={round} highlighted={highlighted} onToggle={onToggle} />
                )}
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}

/**
 * Redesigned draft board: a tier-themed broadcast tile (angular cutout + offset decal shadow) with a
 * sticky-left round rail and color-coded picks. `variant` swaps the per-pick treatment; everything
 * else (chrome, spotlight, legend) is shared. Click any team or pick to spotlight that drafter.
 */
export function DraftBoardV2({ draft, variant }: { draft: DraftData; variant: Exclude<BoardVariant, 'current'> }) {
  const teamBySlot = teamsBySlot(draft)
  const slots = [...teamBySlot.keys()].sort((a, b) => a - b)
  const byCell = new Map<string, DraftPick>()
  for (const p of draft.picks) byCell.set(`${p.round}-${p.slot}`, p)
  const rounds = Array.from({ length: draft.rounds }, (_, i) => i + 1)
  const tier = LEAGUE_STYLES[draft.tier]
  const Cell = CELLS[variant]

  const [highlighted, setHighlighted] = useState<string | null>(null)
  const toggle = (id: string) => setHighlighted((prev) => (prev === id ? null : id))

  return (
    <div className="space-y-3">
      <PositionLegend draft={draft} />
      {/* Near-full-bleed broadcast tile: tier color top rule + angular cutout + hard offset shadow. */}
      <div className="angular decal mx-[calc(50%-50vw+1rem)] border border-border bg-surface shadow-sm">
        <div className={`h-1.5 ${tier.dot}`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] table-fixed border-collapse text-xs">
            <colgroup>
              <col className="w-7 sm:w-10" />
              {slots.map((slot) => <col key={slot} />)}
            </colgroup>
            <thead>
              <HeaderRow slots={slots} teamBySlot={teamBySlot} year={draft.year} highlighted={highlighted} onToggle={toggle} />
            </thead>
            <tbody>
              <BodyRows rounds={rounds} slots={slots} byCell={byCell} teamBySlot={teamBySlot} numTeams={slots.length} tier={tier} Cell={Cell} highlighted={highlighted} onToggle={toggle} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
