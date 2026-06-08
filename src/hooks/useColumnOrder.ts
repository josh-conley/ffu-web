import { useCallback, useEffect, useMemo, useState } from 'react'

// Persisted left-to-right order for a set of reorderable column keys. The stored order is
// reconciled with the current key set on every render (drop removed keys, append new ones), so it
// survives changes to the available columns. Empty stored = the natural (given) order.

function readOrder(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function useColumnOrder(storageKey: string, keys: string[]) {
  const [stored, setStored] = useState<string[]>(() => readOrder(storageKey))

  const order = useMemo(() => {
    const known = stored.filter((k) => keys.includes(k))
    const appended = keys.filter((k) => !known.includes(k))
    return [...known, ...appended]
  }, [stored, keys])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(stored))
    } catch {
      /* storage unavailable (private mode) — order just won't persist */
    }
  }, [storageKey, stored])

  const reorder = useCallback((next: string[]) => setStored(next), [])
  const reset = useCallback(() => setStored([]), [])

  return { order, reorder, reset, isCustom: stored.length > 0 }
}
