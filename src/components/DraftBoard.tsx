import { useState } from 'react'
import type { DraftData, DraftPick, DraftPlayer } from '@/data'
import { getMember, nameForYear } from '@/config'
import { pickLabel, teamsBySlot } from '@/selectors'
import { posBg, posClass } from './positions'
import { TeamLogo } from './TeamLogo'

/** Compact player label so all columns fit without horizontal scroll: skill players become
 *  "F. Last"; defenses (no personal name) become their team abbreviation. */
function shortName(player: DraftPlayer): string {
  if (player.position === 'DEF') return player.nflTeam ?? player.name
  const parts = player.name.trim().split(/\s+/)
  const first = parts[0]
  if (parts.length < 2 || !first) return player.name
  return `${first[0]}. ${parts.slice(1).join(' ')}`
}

/**
 * Where the draft flows out of this pick (snake order): odd rounds run left→right (→), even rounds
 * right→left (←), and the round's final pick turns down to the next round (↓). The very last pick
 * of the draft has nowhere to go.
 */
function snakeArrow(round: number, slot: number, numTeams: number, totalRounds: number): string {
  const odd = round % 2 === 1
  const turns = odd ? slot === numTeams : slot === 1
  if (turns) return round === totalRounds ? '' : '↓'
  return odd ? '→' : '←'
}

/** One pick. Every cell is the same fixed shape; trades surface as a subtle neutral edge + a muted
 *  "via {ABBR}" tag (the acquiring team), and the snake-flow direction sits in the bottom-right.
 *  Clicking a pick highlights every pick its drafter made (see DraftBoard's `highlighted` state). */
function PickCell({ pick, ownerId, numTeams, totalRounds, highlighted, onToggle }: {
  pick: DraftPick
  ownerId: string | undefined
  numTeams: number
  totalRounds: number
  highlighted: string | null
  onToggle: (id: string) => void
}) {
  const traded = ownerId !== undefined && pick.memberId !== ownerId
  const isHighlight = highlighted === pick.memberId
  const dimmed = highlighted !== null && !isHighlight
  const state = isHighlight
    ? 'relative z-10 ring-2 ring-accent'
    : dimmed
      ? 'opacity-30'
      : 'hover:ring-1 hover:ring-muted/50'
  return (
    // Uniform 3-line cell (meta · name · position). A trade fills the footer's otherwise-empty
    // right edge — no extra row — so traded and non-traded cells share identical dimensions/layout.
    // border-l-2 is on every cell (transparent by default) so the traded accent edge never shifts text.
    <button
      type="button"
      onClick={() => onToggle(pick.memberId)}
      aria-pressed={isHighlight}
      className={`flex w-full flex-col gap-1 border-l-2 p-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${posBg(pick.player.position)} ${traded ? 'border-l-accent/40' : 'border-l-transparent'} ${state}`}
    >
      <div className="flex items-center justify-between text-[10px] tabular-nums text-muted">
        <span className="font-semibold">{pickLabel(pick, numTeams)}</span>
        <span className="flex items-center gap-1">
          <span>#{pick.overall}</span>
          <span aria-hidden className="font-semibold">{snakeArrow(pick.round, pick.slot, numTeams, totalRounds)}</span>
        </span>
      </div>
      <div className="truncate font-medium" title={pick.player.name}>{shortName(pick.player)}</div>
      <div className="flex items-center justify-between gap-1 text-[10px] text-muted">
        <span className="flex min-w-0 items-center gap-1">
          <span className={`rounded px-1 font-semibold ${posClass(pick.player.position)}`}>{pick.player.position}</span>
          {pick.player.nflTeam && pick.player.position !== 'DEF' && <span className="truncate">{pick.player.nflTeam}</span>}
        </span>
        {traded && <span className="shrink-0 font-medium text-accent">→ {getMember(pick.memberId)?.abbreviation ?? '?'}</span>}
      </div>
    </button>
  )
}

export function DraftBoard({ draft }: { draft: DraftData }) {
  const teamBySlot = teamsBySlot(draft)
  const slots = [...teamBySlot.keys()].sort((a, b) => a - b)
  const byCell = new Map<string, DraftPick>()
  for (const p of draft.picks) byCell.set(`${p.round}-${p.slot}`, p)
  const rounds = Array.from({ length: draft.rounds }, (_, i) => i + 1)

  // Click a team (header or any of its picks) to spotlight every pick it made; click again to clear.
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const toggle = (id: string) => setHighlighted((prev) => (prev === id ? null : id))

  return (
    // Near-full-bleed: break out of the page's centered max-width container to (almost) the full
    // viewport — the board is a wide horizontally-scrollable grid — but leave a small gutter on each
    // side rather than running flush to the screen edge.
    <div className="mx-[calc(50%-50vw+1rem)] overflow-x-auto border border-border bg-surface shadow-sm">
      {/* w-full + table-fixed = 12 equal columns that fill the container (no horizontal scroll on
          desktop/tablet); min-w keeps cells readable on phones, where it falls back to scrolling. */}
      <table className="w-full min-w-[60rem] table-fixed text-xs">
        {/* Light themed header lifted by an FFU-red accent rule (echoes the navbar) — frames the
            colorful pick grid without the weight of a solid dark bar. */}
        <thead>
          <tr>
            {slots.map((slot) => {
              const ownerId = teamBySlot.get(slot)
              const dim = highlighted !== null && ownerId !== highlighted
              return (
                <th key={slot} scope="col" className="border-b-2 border-accent bg-surface-2 p-0">
                  <button
                    type="button"
                    onClick={() => ownerId && toggle(ownerId)}
                    aria-pressed={ownerId !== undefined && highlighted === ownerId}
                    className={`flex w-full flex-col items-center gap-1 px-1 py-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${dim ? 'opacity-40' : 'hover:bg-surface'}`}
                  >
                    {ownerId && <TeamLogo ffuId={ownerId} size={24} />}
                    <span className="max-w-full truncate text-[11px] font-semibold">
                      {ownerId ? (nameForYear(ownerId, draft.year) ?? ownerId) : slot}
                    </span>
                    {ownerId && (
                      <span className="text-[9px] font-medium uppercase tracking-widest text-muted">
                        {getMember(ownerId)?.abbreviation}
                      </span>
                    )}
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rounds.map((round) => (
            <tr key={round}>
              {slots.map((slot) => {
                const pick = byCell.get(`${round}-${slot}`)
                return (
                  <td key={slot} className="p-0.5 align-top">
                    {pick && (
                      <PickCell
                        pick={pick}
                        ownerId={teamBySlot.get(slot)}
                        numTeams={slots.length}
                        totalRounds={draft.rounds}
                        highlighted={highlighted}
                        onToggle={toggle}
                      />
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
