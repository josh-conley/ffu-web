import { createContext, useContext } from 'react'

// Leaf module so TeamLogo (consumer) and TeamProfileProvider (provider) can both import it
// without a cycle — same pattern as tableShared.

/** Opens the global team-profile modal for an ffuId. Null when no provider is mounted (tests). */
export const TeamProfileContext = createContext<((ffuId: string) => void) | null>(null)

export function useOpenTeamProfile() {
  return useContext(TeamProfileContext)
}
