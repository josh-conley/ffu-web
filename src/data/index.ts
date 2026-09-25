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
  AdpSnapshot,
  Game,
  ScheduledGame,
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
  LeagueRosterSummary,
  DraftSchedule,
  DraftOrderSlot,
  LiveDraftOrder,
  NflGameStatus,
  NflGameClock,
  PlayerProjection,
} from './types'
export { fetchNflState, fetchLiveSeason, fetchLiveLineups, fetchLiveWeekLineups, fetchMissingPlayers } from './liveSleeper'
export { fetchNflWeekGames, fetchWeekProjections } from './liveNfl'
export { fetchLeagueRosters } from './liveRosters'
export { fetchDraftSchedules, fetchDraftOrder, fetchDraftPicks } from './liveDrafts'
export type { NflState, LiveLineups, LiveWeekLineups } from './liveSleeper'
