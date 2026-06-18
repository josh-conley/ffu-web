import type { Tier } from '@/config/types'
import type { DraftData, PlayerMap, SeasonData, SeasonLineups, SeasonSummary, Tournament } from './types'
import type { LeagueDataProvider } from './provider'
import { assertDraftData, assertManifest, assertPlayerMap, assertSeasonData, assertSeasonLineups, assertTournament } from './validate'

// public/data is served at the site root (Vite base '/').
const BASE = '/data'

/**
 * Reads the normalized v2 JSON from public/data. Caches one in-flight promise per path so
 * repeated reads (across hooks/components) coalesce into a single fetch. Validates every
 * response at the boundary via the guards in validate.ts.
 */
export class StaticFileProvider implements LeagueDataProvider {
  private readonly cache = new Map<string, Promise<unknown>>()

  private load<T>(path: string, parse: (raw: unknown, ctx: string) => T, optional = false): Promise<T | null> {
    const cached = this.cache.get(path)
    if (cached) return cached as Promise<T | null>
    const promise = (async (): Promise<T | null> => {
      const res = await fetch(`${BASE}${path}`)
      if (res.status === 404 && optional) return null
      if (!res.ok) throw new Error(`Failed to load ${path}: HTTP ${res.status}`)
      return parse(await res.json(), path)
    })()
    this.cache.set(path, promise)
    return promise
  }

  getSeasons(): Promise<SeasonSummary[]> {
    return this.load('/seasons.json', (raw, ctx) => assertManifest(raw, ctx).seasons) as Promise<SeasonSummary[]>
  }

  getSeason(tier: Tier, year: string): Promise<SeasonData> {
    // Required: non-optional load only resolves null on a thrown error, so the cast is safe.
    return this.load(`/${year}/${tier.toLowerCase()}.json`, assertSeasonData) as Promise<SeasonData>
  }

  getDraft(tier: Tier, year: string): Promise<DraftData | null> {
    return this.load(`/${year}/${tier.toLowerCase()}.draft.json`, assertDraftData, true)
  }

  getLineups(tier: Tier, year: string): Promise<SeasonLineups | null> {
    return this.load(`/${year}/${tier.toLowerCase()}.lineups.json`, assertSeasonLineups, true)
  }

  getPlayers(): Promise<PlayerMap> {
    return this.load('/players.json', assertPlayerMap) as Promise<PlayerMap>
  }

  getTournament(year: string): Promise<Tournament | null> {
    return this.load(`/${year}/tournament.json`, assertTournament, true)
  }
}
