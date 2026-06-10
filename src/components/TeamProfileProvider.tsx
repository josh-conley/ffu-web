import { useState, type ReactNode } from 'react'
import { TeamProfileContext } from './teamProfile'
import { TeamProfileModal } from './TeamProfileModal'

/** Mounts once in the app shell: makes every TeamLogo open the quick team-profile modal. */
export function TeamProfileProvider({ children }: { children: ReactNode }) {
  const [ffuId, setFfuId] = useState<string | null>(null)
  return (
    <TeamProfileContext.Provider value={setFfuId}>
      {children}
      {ffuId !== null && <TeamProfileModal ffuId={ffuId} onClose={() => setFfuId(null)} />}
    </TeamProfileContext.Provider>
  )
}
