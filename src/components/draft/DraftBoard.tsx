import { useState } from 'react'
import type { DraftData, DraftPick } from '@/data'
import { teamsBySlot } from '@/selectors'
import { LEAGUE_STYLES, type LeagueStyle } from '../leagues'
import { BoardFrame, RoundRailCorner } from './BoardFrame'
import { PickCell } from './PickCell'
import { PositionLegend, RoundLabel, TeamHeader } from './parts'

/** Team nameplates across the top, with a "Rd" corner pinned left on horizontal scroll. */
function HeaderRow({ slots, teamBySlot, year, highlighted, onToggle }: {
  slots: number[]
  teamBySlot: Map<number, string>
  year: string
  highlighted: string | null
  onToggle: (id: string) => void
}) {
  return (
    <tr>
      <RoundRailCorner />
      {slots.map((slot) => (
        <TeamHeader key={slot} slot={slot} ownerId={teamBySlot.get(slot)} year={year} highlighted={highlighted} onToggle={onToggle} />
      ))}
    </tr>
  )
}

/** One row per round: the tier-tinted round-rail label (pinned left), then a pick nameplate per slot. */
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
 * The draft board: a tier-themed bordered tile (tier color top rule). On desktop the grid fits; on
 * narrow screens it scrolls horizontally with the round rail
 * pinned left, while the page scrolls vertically as normal. Each pick is a position-colored nameplate;
 * click any team or pick to spotlight every selection that drafter made.
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
      <BoardFrame
        tier={tier}
        slots={slots}
        head={<HeaderRow slots={slots} teamBySlot={teamBySlot} year={draft.year} highlighted={highlighted} onToggle={toggle} />}
        body={<BodyRows rounds={rounds} slots={slots} byCell={byCell} teamBySlot={teamBySlot} numTeams={slots.length} tier={tier} highlighted={highlighted} onToggle={toggle} />}
      />
    </div>
  )
}
