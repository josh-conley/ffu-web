import type { Tournament } from '../../../src/data/types'
import { assertTournament } from '../../../src/data/validate'

// Reads the Cup from the live site — the same file the page reads — so the field, the bracket and
// the lock time can never differ between what members see and what the Worker enforces. Cached
// for a minute per Worker instance: a fresh draw or a moved lock time takes effect within that.

const TTL_MS = 60_000
const cache = new Map<string, { at: number; value: Tournament | null }>()

export type TournamentLoader = (year: string) => Promise<Tournament | null>

export function siteTournamentLoader(dataOrigin: string, now: () => number = Date.now): TournamentLoader {
  return async (year) => {
    const hit = cache.get(year)
    if (hit && now() - hit.at < TTL_MS) return hit.value
    const res = await fetch(`${dataOrigin}/data/${year}/tournament.json`)
    if (res.status === 404) {
      cache.set(year, { at: now(), value: null })
      return null
    }
    if (!res.ok) throw new Error(`tournament.json for ${year}: HTTP ${res.status}`)
    const value = assertTournament(await res.json(), `${year}/tournament.json`)
    cache.set(year, { at: now(), value })
    return value
  }
}
