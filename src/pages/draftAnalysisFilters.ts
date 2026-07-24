import { useMemo } from 'react'
import { FILTER_POSITIONS } from '@/selectors'

// URL-backed selection state for the Draft Analysis filters. Kept in a .ts module (no components)
// so both the page and its controls can import without tripping the fast-refresh export rule.

/** Position selection from the `pos` URL param (validated, canonically ordered, never empty). */
export function useSelectedPositions(posParam: string, setPos: (v: string) => void) {
  const selected = useMemo<string[]>(() => {
    const raw = new Set(posParam.split(',').filter((p) => (FILTER_POSITIONS as readonly string[]).includes(p)))
    const ordered = FILTER_POSITIONS.filter((p) => raw.has(p))
    return ordered.length > 0 ? [...ordered] : [...FILTER_POSITIONS]
  }, [posParam])
  const togglePos = (p: string) => {
    const next = new Set(selected)
    if (next.has(p)) next.delete(p)
    else next.add(p)
    if (next.size === 0) return // always keep at least one position selected
    setPos(FILTER_POSITIONS.filter((q) => next.has(q)).join(','))
  }
  const selectAll = () => setPos(FILTER_POSITIONS.join(','))
  return { selected, togglePos, selectAll }
}

/** Draft-slot selection from the `slots` URL param — empty/all means "no filter" (all slots checked). */
export function useSelectedSlots(slotsParam: string, setSlots: (v: string) => void, maxSlot: number) {
  const allSlots = useMemo(() => Array.from({ length: maxSlot }, (_, i) => i + 1), [maxSlot])
  const selected = useMemo(() => {
    const parsed = slotsParam.split(',').map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= maxSlot)
    return parsed.length > 0 ? new Set(parsed) : new Set(allSlots)
  }, [slotsParam, maxSlot, allSlots])
  const toggleSlot = (n: number) => {
    const next = new Set(selected)
    if (next.has(n)) next.delete(n)
    else next.add(n)
    if (next.size === 0) return // keep at least one slot selected
    setSlots(next.size === maxSlot ? '' : [...next].sort((a, b) => a - b).join(','))
  }
  // Memoized so the analysis memo isn't invalidated every render by a fresh array; undefined = no filter.
  const slotFilter = useMemo(() => (selected.size === maxSlot ? undefined : [...selected]), [selected, maxSlot])
  const selectAll = () => setSlots('')
  return { allSlots, selected, toggleSlot, slotFilter, selectAll }
}
