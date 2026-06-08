import { useCallback, useEffect, useState } from 'react'

// Per-table column show/hide, persisted to localStorage so a member's choice survives reloads.
// Stores the HIDDEN keys (empty = all visible, the default), keyed per table via `storageKey`.

function readHidden(storageKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function useColumnVisibility(storageKey: string) {
  const [hidden, setHidden] = useState<Set<string>>(() => readHidden(storageKey))

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...hidden]))
    } catch {
      /* storage unavailable (private mode) — visibility just won't persist */
    }
  }, [storageKey, hidden])

  const toggle = useCallback((key: string) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const reset = useCallback(() => setHidden(new Set()), [])
  const hideAll = useCallback((keys: string[]) => setHidden(new Set(keys)), [])

  return { hidden, toggle, reset, hideAll }
}
