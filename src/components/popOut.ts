import { createContext, useContext } from 'react'
import type { LiveGameRef } from './liveGame'

// Leaf module so the pop-out button (consumer) and PopOutProvider can both import it without a
// cycle — same pattern as teamProfile.

/** Floats a live game's box score in an always-on-top window; resolves once it's open. Null where
 *  the browser can't (anything but desktop Chrome/Edge — see lib/pictureInPicture) or with no
 *  provider (tests). Call it straight from a click: the browser only opens one for a user gesture. */
export const PopOutContext = createContext<((game: LiveGameRef) => Promise<void>) | null>(null)

export function usePopOut() {
  return useContext(PopOutContext)
}
