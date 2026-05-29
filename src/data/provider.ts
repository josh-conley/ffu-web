import type { Tier } from '@/config/types'
import type { DraftData, SeasonData, SeasonSummary } from './types'

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
}

// NOTE: a `LineupProvider` (live Sleeper starters + player points for the roster modal) is a
// deferred, post-core enhancement. It'll be added here when that view is built — the
// games[].lineups seam is reserved for it. Not modelled now (no consumer, no shape yet).
