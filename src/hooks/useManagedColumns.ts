import { useCallback, useMemo } from 'react'
import type { Column } from '@/components/DataTable'
import { useColumnVisibility } from './useColumnVisibility'
import { useColumnOrder } from './useColumnOrder'

// Bundles per-table column management (persisted show/hide + drag order) for a DataTable. The
// `lockedKey` column stays first and is never reordered or hidden. Returns the visible columns in
// the chosen order plus the handlers the ColumnChooser + DataTable need.

/**
 * Splice a reordered subset of VISIBLE keys back into the full order, leaving keys not in the subset
 * (hidden columns) in their original slots. e.g. full [a,b,c,d] with c hidden, visible reordered to
 * [b,a,d] → [b,a,c,d].
 */
export function mergeVisibleOrder(fullOrder: string[], newVisibleKeys: string[]): string[] {
  const visibleSet = new Set(newVisibleKeys)
  const queue = [...newVisibleKeys]
  return fullOrder.map((k) => (visibleSet.has(k) ? (queue.shift() as string) : k))
}

export function useManagedColumns<T>(columns: Column<T>[], lockedKey: string, storageKey: string) {
  const { hidden, toggle, reset: resetVisibility, hideAll } = useColumnVisibility(`${storageKey}-visible`)
  const reorderableKeys = useMemo(() => columns.filter((c) => c.key !== lockedKey).map((c) => c.key), [columns, lockedKey])
  const { order, reorder, reset: resetOrder, isCustom: orderCustomized } = useColumnOrder(`${storageKey}-order`, reorderableKeys)

  const visible = useMemo(() => {
    const byKey = new Map(columns.map((c) => [c.key, c] as const))
    const locked = byKey.get(lockedKey)
    const rest = order.map((k) => byKey.get(k)).filter((c): c is Column<T> => Boolean(c))
    return [...(locked ? [locked] : []), ...rest].filter((c) => c.key === lockedKey || !hidden.has(c.key))
  }, [columns, order, hidden, lockedKey])

  const options = useMemo(() => columns.map((c) => ({ key: c.key, header: c.header })), [columns])

  // The header drags only the VISIBLE non-locked columns; merge their new order back into the full
  // order (hidden columns keep their slots) before persisting.
  const onReorder = useCallback((newVisibleKeys: string[]) => reorder(mergeVisibleOrder(order, newVisibleKeys)), [order, reorder])

  return { visible, options, hidden, toggle, resetVisibility, hideAll, onReorder, resetOrder, orderCustomized }
}
