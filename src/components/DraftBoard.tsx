import type { DraftData, DraftPick, DraftPlayer } from '@/data'
import { getMember, nameForYear } from '@/config'
import { TeamLogo } from './TeamLogo'

const POS_COLOR: Record<string, string> = {
  QB: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  RB: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  WR: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  TE: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  K: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  DEF: 'bg-surface-2 text-muted',
}
const posClass = (p: string) => POS_COLOR[p] ?? 'bg-surface-2 text-muted'

// Subtle whole-cell tint by position (lighter than the badge so the two layers read as one pick,
// not a clash). Pairs with a thin border to make each pick a distinct tile.
const POS_BG: Record<string, string> = {
  QB: 'bg-red-50 dark:bg-red-500/10',
  RB: 'bg-emerald-50 dark:bg-emerald-500/10',
  WR: 'bg-sky-50 dark:bg-sky-500/10',
  TE: 'bg-amber-50 dark:bg-amber-500/10',
  K: 'bg-purple-50 dark:bg-purple-500/10',
  DEF: 'bg-surface-2',
}
const posBg = (p: string) => POS_BG[p] ?? 'bg-surface-2'

/** Map slot → original draft-order owner. Prefer draftOrder; fall back to round-1 picks if empty. */
function teamsBySlot(draft: DraftData): Map<number, string> {
  const bySlot = new Map<number, string>()
  for (const [memberId, slot] of Object.entries(draft.draftOrder)) bySlot.set(slot, memberId)
  if (bySlot.size === 0) {
    for (const p of draft.picks) if (p.round === 1) bySlot.set(p.slot, p.memberId)
  }
  return bySlot
}

/**
 * Pick label in true draft notation (e.g. `6.09`), derived from the OVERALL pick so snake
 * even-rounds read correctly — the within-round position reverses each round, but `overall` does
 * not, so `overall - (round-1)*teams` is the real pick-in-round regardless of slot.
 */
function pickLabel(pick: DraftPick, numTeams: number): string {
  const inRound = numTeams > 0 ? pick.overall - (pick.round - 1) * numTeams : pick.slot
  return `${pick.round}.${String(inRound).padStart(2, '0')}`
}

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
 *  "via {ABBR}" tag (the acquiring team), and the snake-flow direction sits in the bottom-right. */
function PickCell({ pick, ownerId, numTeams, totalRounds }: { pick: DraftPick; ownerId: string | undefined; numTeams: number; totalRounds: number }) {
  const traded = ownerId !== undefined && pick.memberId !== ownerId
  return (
    <div className={`flex min-h-[4.25rem] w-full flex-col p-1 ${posBg(pick.player.position)} ${traded ? 'border-l-2 border-l-accent/40' : ''}`}>
      <div className="flex items-center justify-between text-[10px] tabular-nums text-muted">
        <span className="font-semibold">{pickLabel(pick, numTeams)}</span>
        <span>#{pick.overall}</span>
      </div>
      {/* Name takes the slack so it sits vertically centered between the meta and position rows. */}
      <div className="flex flex-1 items-center py-0.5">
        <span className="w-full truncate font-medium" title={pick.player.name}>{shortName(pick.player)}</span>
      </div>
      <div className="flex items-center justify-between gap-1 text-[10px] text-muted">
        <span className="flex min-w-0 items-center gap-1">
          <span className={`rounded px-1 font-semibold ${posClass(pick.player.position)}`}>{pick.player.position}</span>
          {pick.player.nflTeam && pick.player.position !== 'DEF' && <span className="truncate">{pick.player.nflTeam}</span>}
        </span>
        <span aria-hidden className="font-semibold">{snakeArrow(pick.round, pick.slot, numTeams, totalRounds)}</span>
      </div>
      {/* Reserved row so a traded tag never changes the cell's size. The "→ {ABBR}" (the team that
          acquired the pick) is accent-colored to read distinctly from the muted snake-flow arrows. */}
      <div className="h-3.5 truncate text-[10px] font-medium text-accent">
        {traded ? `→ ${getMember(pick.memberId)?.abbreviation ?? '?'}` : ''}
      </div>
    </div>
  )
}

export function DraftBoard({ draft }: { draft: DraftData }) {
  const teamBySlot = teamsBySlot(draft)
  const slots = [...teamBySlot.keys()].sort((a, b) => a - b)
  const byCell = new Map<string, DraftPick>()
  for (const p of draft.picks) byCell.set(`${p.round}-${p.slot}`, p)
  const rounds = Array.from({ length: draft.rounds }, (_, i) => i + 1)

  return (
    // Near-full-bleed: break out of the page's centered max-width container to (almost) the full
    // viewport — the board is a wide horizontally-scrollable grid — but leave a small gutter on each
    // side rather than running flush to the screen edge.
    <div className="mx-[calc(50%-50vw+1rem)] overflow-x-auto border-y border-border bg-surface shadow-sm">
      {/* w-full + table-fixed = 12 equal columns that fill the container (no horizontal scroll on
          desktop/tablet); min-w keeps cells readable on phones, where it falls back to scrolling. */}
      <table className="w-full min-w-[60rem] table-fixed text-xs">
        <thead className="bg-surface-2">
          <tr>
            {slots.map((slot) => {
              const ownerId = teamBySlot.get(slot)
              return (
                <th key={slot} scope="col" className="px-1 py-2">
                  <span className="flex w-full flex-col items-center gap-0.5">
                    {ownerId && <TeamLogo ffuId={ownerId} size={20} />}
                    <span className="max-w-full truncate font-semibold">
                      {ownerId ? (nameForYear(ownerId, draft.year) ?? ownerId) : slot}
                    </span>
                    {ownerId && (
                      <span className="text-[10px] font-normal tracking-wide text-muted">
                        {getMember(ownerId)?.abbreviation}
                      </span>
                    )}
                  </span>
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
                    {pick && <PickCell pick={pick} ownerId={teamBySlot.get(slot)} numTeams={slots.length} totalRounds={draft.rounds} />}
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
