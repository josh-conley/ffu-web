import { useState } from 'react'
import type { DraftData, DraftPick } from '@/data'
import { teamsBySlot } from '@/selectors'
import { LEAGUE_STYLES, type LeagueStyle } from '../leagues'
import { PickCell } from './PickCell'
import { PositionLegend, RoundLabel, TeamHeader } from './parts'

/** Team nameplates across the top, frozen on scroll, with a sticky-both-axes "Rd" corner. */
function HeaderRow({ slots, teamBySlot, year, tier, highlighted, onToggle }: {
  slots: number[]
  teamBySlot: Map<number, string>
  year: string
  tier: LeagueStyle
  highlighted: string | null
  onToggle: (id: string) => void
}) {
  return (
    <tr>
      <th className={`sticky left-0 top-0 z-30 border-b-2 border-r border-border bg-surface-2 px-0.5 py-1 text-center text-[9px] font-bold uppercase tracking-wider text-muted sm:px-1 ${tier.border}`}>
        Rd
      </th>
      {slots.map((slot) => (
        <TeamHeader key={slot} slot={slot} ownerId={teamBySlot.get(slot)} year={year} tier={tier} highlighted={highlighted} onToggle={onToggle} />
      ))}
    </tr>
  )
}

/** One row per round: the tier-tinted round-rail label (frozen left), then a pick nameplate per slot. */
function BodyRows({ rounds, slots, byCell, teamBySlot, numTeams, tier, highlighted, onToggle }: {
  rounds: number[]
  slots: number[]
  byCell: Map<string, DraftPick>
  teamBySlot: Map<number, string>
  numTeams: number
  tier: LeagueStyle
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
                  <PickCell pick={pick} ownerId={teamBySlot.get(slot)} numTeams={numTeams} highlighted={highlighted} onToggle={onToggle} />
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
 * The draft board: a tier-themed broadcast tile (angular cutout + offset decal shadow, tier color top
 * rule) whose grid scrolls inside itself — freezing the team nameplates (top) and round rail (left)
 * like a live draft tracker. Each pick is a position-colored nameplate; click any team or pick to
 * spotlight every selection that drafter made.
 */
export function DraftBoard({ draft }: { draft: DraftData }) {
  const teamBySlot = teamsBySlot(draft)
  const slots = [...teamBySlot.keys()].sort((a, b) => a - b)
  const byCell = new Map<string, DraftPick>()
  for (const p of draft.picks) byCell.set(`${p.round}-${p.slot}`, p)
  const rounds = Array.from({ length: draft.rounds }, (_, i) => i + 1)
  const tier = LEAGUE_STYLES[draft.tier]

  const [highlighted, setHighlighted] = useState<string | null>(null)
  const toggle = (id: string) => setHighlighted((prev) => (prev === id ? null : id))

  return (
    <div className="space-y-3">
      <PositionLegend draft={draft} />
      <div className="angular decal mx-[calc(50%-50vw+1rem)] border border-border bg-surface shadow-sm">
        <div className={`h-1.5 ${tier.dot}`} />
        <div className="max-h-[78vh] overflow-auto">
          <table className="w-full min-w-[64rem] table-fixed border-collapse text-xs">
            <colgroup>
              <col className="w-7 sm:w-10" />
              {slots.map((slot) => <col key={slot} />)}
            </colgroup>
            <thead>
              <HeaderRow slots={slots} teamBySlot={teamBySlot} year={draft.year} tier={tier} highlighted={highlighted} onToggle={toggle} />
            </thead>
            <tbody>
              <BodyRows rounds={rounds} slots={slots} byCell={byCell} teamBySlot={teamBySlot} numTeams={slots.length} tier={tier} highlighted={highlighted} onToggle={toggle} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
