import { useEffect, useRef } from 'react'

/**
 * Jump to the top of the page whenever `key` changes — for views that swap their whole contents
 * without a route change (the Members page keeps selection in a query param, so react-router never
 * sees a navigation and the browser holds the old scroll position).
 *
 * The first render is deliberately skipped: on a deep link or refresh the browser has already
 * restored a position, and stealing it would be worse than leaving it alone.
 */
export function useScrollToTop(key: string): void {
  const previous = useRef(key)

  useEffect(() => {
    if (previous.current === key) return
    previous.current = key
    window.scrollTo(0, 0)
  }, [key])
}
