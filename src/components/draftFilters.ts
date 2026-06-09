import type { DraftData } from '@/data'
import { nameForYear } from '@/config'
import type { FilterOption } from '@/hooks/useFilters'

// Filter options shared by the draft views (List + Value) — one source for how a draft's
// positions and teams become FilterBar choices.

const POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

/** Positions actually present in this draft, in canonical order (then any extras alphabetically). */
export function positionOptions(draft: DraftData): FilterOption[] {
  const present = new Set(draft.picks.map((p) => p.player.position))
  const ranked = [...present].sort((a, b) => {
    const ia = POS_ORDER.indexOf(a)
    const ib = POS_ORDER.indexOf(b)
    return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib) || a.localeCompare(b)
  })
  return ranked.map((p) => ({ value: p, label: p }))
}

/** Teams in the draft, in draft-order (by slot), labeled with their name that year. */
export function teamOptions(bySlot: Map<number, string>, year: string): FilterOption[] {
  return [...bySlot.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, memberId]) => ({ value: memberId, label: nameForYear(memberId, year) ?? memberId }))
}
