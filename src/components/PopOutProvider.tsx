import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { nameForYear } from '@/config'
import { openPipWindow, pipSupported, type PipWindow } from '@/lib/pictureInPicture'
import type { LiveGameRef } from './liveGame'
import { LiveMatchupPopOut } from './LiveMatchupPopOut'
import { PopOutContext } from './popOut'

/** Room for a full lineup a side at the box score's phone layout; the viewer can resize it. */
const SIZE = { width: 440, height: 640 }

const titleOf = ({ year, memberIds: [a, b] }: LiveGameRef) => `${nameForYear(a, year) ?? a} vs ${nameForYear(b, year) ?? b}`

interface Open {
  pip: PipWindow
  game: LiveGameRef
}

/**
 * Mounts once in the app shell, so a popped-out game outlives the page it came from: navigating
 * the site leaves it floating. Its React tree stays here and renders into the other window through
 * a portal, so it shares the app's router, data cache and Sleeper reads.
 */
export function PopOutProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null)

  const popOut = useCallback(async (game: LiveGameRef) => {
    // A window closing clears only its own state: popping out a second game closes the first
    // (one per tab), and that close lands after the new one is already open.
    const pip = await openPipWindow(SIZE, titleOf(game), (closed) => setOpen((cur) => (cur?.pip.window === closed ? null : cur)))
    setOpen({ pip, game })
  }, [])

  // Replaced or unmounted: close the window this state owned (a no-op if it's already closed).
  useEffect(() => () => open?.pip.window.close(), [open])

  return (
    <PopOutContext.Provider value={pipSupported() ? popOut : null}>
      {children}
      {open && createPortal(<LiveMatchupPopOut game={open.game} />, open.pip.root)}
    </PopOutContext.Provider>
  )
}
