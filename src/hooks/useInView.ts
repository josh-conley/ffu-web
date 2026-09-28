import { useCallback, useEffect, useState } from 'react'

/**
 * True once the element given to `ref` has come within `rootMargin` of the viewport, and true from
 * then on — for deferring a heavy load until the reader scrolls near the section that needs it.
 * Without IntersectionObserver (very old browsers, jsdom) it is simply true.
 */
export function useInView(rootMargin = '200px'): [(el: Element | null) => void, boolean] {
  const supported = typeof IntersectionObserver !== 'undefined'
  const [el, setEl] = useState<Element | null>(null)
  const [seen, setSeen] = useState(!supported)

  useEffect(() => {
    if (!supported || seen || el === null) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setSeen(true)
    }, { rootMargin })
    observer.observe(el)
    return () => observer.disconnect()
  }, [supported, seen, el, rootMargin])

  const ref = useCallback((node: Element | null) => setEl(node), [])
  return [ref, seen]
}
