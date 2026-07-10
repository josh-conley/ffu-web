// Public API + wiring of the data layer. Swapping to a future ApiProvider is this one line.
import { StaticFileProvider } from './staticProvider'
import type { LeagueDataProvider } from './provider'

export const provider: LeagueDataProvider = new StaticFileProvider()

export type { LeagueDataProvider } from './provider'
export type {
  SeasonData,
  SeasonTeam,
  TeamRecord,
  TeamPoints,
  Game,
  GameParticipant,
  Division,
  DraftData,
  DraftPick,
  DraftPlayer,
  SeasonSummary,
  SeasonManifest,
  SeasonLineups,
  WeekLineups,
  TeamLineup,
  LineupPlayer,
  PlayerMap,
  PlayerRef,
  Tournament,
  TournamentRound,
  TournamentMatchup,
  TournamentParticipant,
  LiveSeasonData,
} from './types'
export { fetchNflState, fetchLiveSeason } from './liveSleeper'
export type { NflState } from './liveSleeper'
