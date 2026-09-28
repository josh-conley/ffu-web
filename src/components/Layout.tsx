import { useRef, type MouseEvent } from 'react'
import { Outlet } from 'react-router-dom'
import { PREVIEW_BUILD } from '@/config'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useRouteFocus } from '@/hooks/useRouteFocus'
import { Header } from './Header'
import { PreviewBanner } from './PreviewBanner'
import { TeamProfileProvider } from './TeamProfileProvider'

/** App shell: skip link + persistent header wrapping routed pages. Owns the tab title and the
 *  focus move on navigation, so no page has to remember either. */
export function Layout() {
  const mainRef = useRef<HTMLElement>(null)
  usePageTitle()
  useRouteFocus(mainRef)

  // Focus <main> directly rather than following the #main hash: the router would otherwise leave
  // "#main" stuck on the URL, and the next navigation would carry it along.
  const skip = (e: MouseEvent) => {
    e.preventDefault()
    mainRef.current?.focus()
  }

  return (
    <TeamProfileProvider>
      <div className="min-h-screen bg-bg text-text">
        <a
          href="#main"
          onClick={skip}
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:bg-accent focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:uppercase focus:tracking-wide focus:text-accent-fg focus:outline-none focus:ring-2 focus:ring-white"
        >
          Skip to content
        </a>
        <PreviewBanner preview={PREVIEW_BUILD} />
        <Header />
        <main id="main" ref={mainRef} tabIndex={-1} className="mx-auto max-w-5xl px-4 py-8 focus:outline-none">
          <Outlet />
        </main>
      </div>
    </TeamProfileProvider>
  )
}
