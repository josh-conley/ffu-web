import type { DraftData, DraftPlayer } from '@/data'
import { isTraded, teamsBySlot } from '@/selectors'

// Presentation helpers shared by every redesigned draft-board variant (Charter DRY). Pure — no JSX.

/** Compact player label so cells fit without horizontal scroll: skill players become "F. Last";
 *  defenses (no personal name) become their team abbreviation. */
export function shortName(player: DraftPlayer): string {
  if (player.position === 'DEF') return player.nflTeam ?? player.name
  const parts = player.name.trim().split(/\s+/)
  const first = parts[0]
  if (parts.length < 2 || !first) return player.name
  return `${first[0]}. ${parts.slice(1).join(' ')}`
}

/** How many picks in the draft changed hands (sat in a slot owned by another team). */
export function tradeCount(draft: DraftData): number {
  const bySlot = teamsBySlot(draft)
  return draft.picks.reduce((n, p) => (isTraded(p, bySlot) ? n + 1 : n), 0)
}

/** Positions present in this draft, in canonical order (QB→DEF) then any extras alphabetically. */
const POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
export function presentPositions(draft: DraftData): string[] {
  const present = new Set(draft.picks.map((p) => p.player.position))
  return [...present].sort((a, b) => {
    const ia = POS_ORDER.indexOf(a)
    const ib = POS_ORDER.indexOf(b)
    return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib) || a.localeCompare(b)
  })
}

/** Spotlight state for one cell, given which drafter (if any) is currently highlighted. */
export function cellState(highlighted: string | null, memberId: string) {
  const isHighlight = highlighted === memberId
  return { isHighlight, dimmed: highlighted !== null && !isHighlight }
}

/** Tailwind classes for the button wrapping a pick, by spotlight state (shared across variants). */
export function cellStateClass(highlighted: string | null, memberId: string): string {
  const { isHighlight, dimmed } = cellState(highlighted, memberId)
  if (isHighlight) return 'relative z-10 decal ring-1 ring-accent'
  if (dimmed) return 'opacity-30'
  return 'hover:ring-1 hover:ring-muted/40'
}
