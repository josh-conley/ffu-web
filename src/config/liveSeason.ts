import type { Tier } from './types'

/**
 * Sleeper league ids for the season CURRENTLY in progress, keyed by year — deliberately separate
 * from `SEASONS` (which only ever holds completed, statically-backfilled seasons; see
 * src/data/liveSleeper.ts for why the live season isn't modeled as a `SeasonMeta`/`getSeason` row).
 * Empty until the year's Sleeper leagues exist and ids are known. Once a season finishes and is
 * backfilled the normal way (scripts/backfill-*.mjs), remove its entry here and add it to SEASONS.
 */
export const LIVE_LEAGUE_IDS: Partial<Record<string, Record<Tier, string>>> = {}
