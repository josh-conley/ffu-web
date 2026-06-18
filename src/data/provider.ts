import type { Tier } from '@/config/types'
import type { DraftData, PlayerMap, SeasonData, SeasonLineups, SeasonSummary, Tournament } from './types'

/**
 * THE data boundary. All methods are async and domain-phrased (never file paths), so an
 * `ApiProvider` later satisfies the same contract differently underneath — swapping sources
 * is one new impl + one wiring line (see data/index.ts); selectors/UI are untouched.
 */
export interface LeagueDataProvider {
  /** The season manifest (what data exists). Read once; never probe the filesystem. */
  getSeasons(): Promise<SeasonSummary[]>
  getSeason(tier: Tier, year: string): Promise<SeasonData>
  /** Null when a tier-season has no draft (none in current data, but modelled). */
  getDraft(tier: Tier, year: string): Promise<DraftData | null>
  /** Per-game starters + bench. Null for ESPN-era seasons (no recoverable lineups). A live
   *  current-week source would satisfy this same method differently in-season. */
  getLineups(tier: Tier, year: string): Promise<SeasonLineups | null>
  /** Trimmed player id → name/position/team map (resolves the ids inside lineups). */
  getPlayers(): Promise<PlayerMap>
  /** The cross-tier knockout tournament for a year, or null when none is defined. */
  getTournament(year: string): Promise<Tournament | null>
}
