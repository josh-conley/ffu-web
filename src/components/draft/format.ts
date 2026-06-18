import type { DraftData, DraftPlayer } from '@/data'

// Pure presentation helpers for the draft board (Charter DRY). No JSX — unit-tested in format.test.ts.

/** Compact player label so cells fit without horizontal scroll: skill players become "F. Last";
 *  defenses (no personal name) become their team abbreviation. */
export function shortName(player: DraftPlayer): string {
  if (player.position === 'DEF') return player.nflTeam ?? player.name
  const parts = player.name.trim().split(/\s+/)
  const first = parts[0]
  if (parts.length < 2 || !first) return player.name
  return `${first[0]}. ${parts.slice(1).join(' ')}`
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

/**
 * Tailwind classes for the button wrapping a pick, by spotlight state: the selected drafter's picks
 * lift (ring + decal offset shadow), every other pick dims, and nothing is selected by default.
 */
export function cellStateClass(highlighted: string | null, memberId: string): string {
  if (highlighted === memberId) return 'relative z-10 decal ring-1 ring-accent'
  if (highlighted !== null) return 'opacity-30'
  return 'hover:ring-1 hover:ring-muted/40'
}
