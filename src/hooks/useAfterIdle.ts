import { useEffect, useState } from 'react'

/**
 * False until the browser has had an idle moment after `ready` turned true — for work that should
 * wait until what's already on screen has painted, such as the home page's 237KB projections feed
 * behind the live scores. Falls back to the next task where `requestIdleCallback` is missing
 * (Safari), which still lands after the paint. Once true it stays true.
 */
export function useAfterIdle(ready: boolean): boolean {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    if (!ready || idle) return
    if (typeof requestIdleCallback === 'function') {
      // The timeout caps the wait while the season files are still being parsed.
      const id = requestIdleCallback(() => setIdle(true), { timeout: 3_000 })
      return () => cancelIdleCallback(id)
    }
    const id = setTimeout(() => setIdle(true), 0)
    return () => clearTimeout(id)
  }, [ready, idle])
  return idle
}
