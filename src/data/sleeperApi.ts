// Shared HTTP helper for the client-side Sleeper reads (liveSleeper = in-progress scoring,
// liveRosters = who's in each league, liveDrafts = the draft board as it happens). One base url and
// one error shape for all of them (Charter DRY).

const API = 'https://api.sleeper.app/v1'

interface GetOptions {
  /**
   * Ask for the genuinely current answer, for the reads that are polled while their subject is
   * changing (a draft in progress). Two caches sit in the way and each needs its own answer:
   *
   * - the browser's. Sleeper replies without a `max-age`, which leaves a private cache free to
   *   reuse a response on its own heuristics — hence `no-store`.
   * - Sleeper's CDN, which holds `/picks` for 30s (`s-maxage=30`; measured, `cf-cache-status: HIT`
   *   on a repeat). No request header can shorten that, so a unique query parameter is what gets
   *   past it — a distinct cache key, served from origin.
   *
   * Only worth it where the delay would be felt. Everything else takes the cached answer, which is
   * both faster for us and kinder to Sleeper.
   */
  fresh?: boolean
}

export async function sleeperGet<T>(path: string, { fresh }: GetOptions = {}): Promise<T> {
  const url = `${API}${path}`
  const res = fresh ? await fetch(`${url}?_=${Date.now()}`, { cache: 'no-store' }) : await fetch(url)
  if (!res.ok) throw new Error(`Sleeper ${path} -> HTTP ${res.status}`)
  return res.json() as Promise<T>
}
