import { useEffect, useRef, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'

/** How long to wait for a page's heading (lazy route, data behind a spinner) before settling. */
const HEADING_WAIT_MS = 3000

/** Programmatic focus target: focusable by script, not added to the tab order. */
function focusQuietly(el: HTMLElement): void {
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
}

/**
 * Focus the page's <h1> as soon as it exists, else the container itself once the wait is up.
 * Returns a cancel function (for when the route changes again first).
 */
export function focusHeadingWhenReady(container: HTMLElement, waitMs = HEADING_WAIT_MS): () => void {
  const now = container.querySelector('h1')
  if (now) {
    focusQuietly(now)
    return () => {}
  }
  const observer = new MutationObserver(() => {
    const heading = container.querySelector('h1')
    if (!heading) return
    stop()
    focusQuietly(heading)
  })
  const timer = setTimeout(() => {
    stop()
    focusQuietly(container)
  }, waitMs)
  function stop() {
    observer.disconnect()
    clearTimeout(timer)
  }
  observer.observe(container, { childList: true, subtree: true })
  return stop
}

/**
 * After a client-side navigation, move focus to the new page's <h1> so a screen reader announces
 * the page (a SPA otherwise leaves focus on the link that was clicked, and says nothing).
 *
 * Keyed on the pathname only: filters and pickers write the query string, and stealing focus from
 * the control someone is using would be worse than silence. The first render is skipped too: on a
 * fresh load the browser starts at the top of the document, where the skip link is.
 */
export function useRouteFocus(container: RefObject<HTMLElement | null>): void {
  const { pathname } = useLocation()
  const previous = useRef(pathname)

  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    const el = container.current
    return el ? focusHeadingWhenReady(el) : undefined
  }, [pathname, container])
}
