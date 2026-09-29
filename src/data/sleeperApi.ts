// Shared HTTP helper for the client-side Sleeper reads (liveSleeper = in-progress scoring,
// liveRosters = who's in each league, liveDrafts = the draft board as it happens). One base url and
// one error shape for all of them (Charter DRY).

const API = 'https://api.sleeper.app/v1'
// The host Sleeper's own app reads NFL game scores and player projections from. Undocumented (the
// public v1 API has neither), so it can change without notice: every caller treats it as optional
// garnish and must render fine without it.
const APP_API = 'https://api.sleeper.com'

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
   * both faster for us and kinder to Sleeper. A fresh answer still lands in the in-memory cache
   * below, so the next ordinary read of the same path gets it.
   */
  fresh?: boolean
  /**
   * How old an answer from the in-memory cache (see `recent`) this caller will take. Defaults to
   * `DEFAULT_MAX_AGE_MS`; `Infinity` for facts that don't move inside a visit (who owns a roster).
   */
  maxAgeMs?: number
}

/**
 * Sleeper's CDN holds its league reads for 60s (`s-maxage=60` on `/matchups`, measured), so asking
 * again inside that window gets the same bytes back. Answering from memory instead costs nothing
 * in freshness and saves the round trip.
 *
 * That 60s is a floor, not a ceiling: the same header allows `stale-while-revalidate=300`, and on a
 * game night the CDN served `/matchups` 109s old and still "UPDATING" while origin had moved on
 * (2026-09-28, measured). The live score polls therefore read `fresh`.
 */
const DEFAULT_MAX_AGE_MS = 60_000

/**
 * One promise per url, in flight or recently settled — the StaticFileProvider idea, with an age
 * limit because this data moves. It is what lets the home page's scores, its projections and a box
 * score share one read of `/rosters` or `/matchups/{week}` instead of each making their own: the
 * callers stay independent, and the data layer notices they asked for the same thing. The age runs
 * from when the request started, so a 60s poll never lands on its own previous answer.
 */
const recent = new Map<string, { startedAt: number; promise: Promise<unknown> }>()

/** Empties the in-memory cache. For tests, whose stubbed `fetch` changes between cases. */
export function clearSleeperCache(): void {
  recent.clear()
}

async function request<T>(url: string, path: string, fresh: boolean | undefined): Promise<T> {
  const res = fresh ? await fetch(`${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`, { cache: 'no-store' }) : await fetch(url)
  if (!res.ok) throw new Error(`Sleeper ${path} -> HTTP ${res.status}`)
  return res.json() as Promise<T>
}

function get<T>(base: string, path: string, { fresh, maxAgeMs = DEFAULT_MAX_AGE_MS }: GetOptions): Promise<T> {
  const url = `${base}${path}`
  const hit = recent.get(url)
  if (!fresh && hit && Date.now() - hit.startedAt < maxAgeMs) return hit.promise as Promise<T>
  const entry = { startedAt: Date.now(), promise: request<T>(url, path, fresh) }
  recent.set(url, entry)
  // Never keep a failure: the next read retries rather than replaying the error.
  entry.promise.catch(() => recent.get(url) === entry && recent.delete(url))
  return entry.promise as Promise<T>
}

export function sleeperGet<T>(path: string, options: GetOptions = {}): Promise<T> {
  return get<T>(API, path, options)
}

/** A read from Sleeper's undocumented app API (see APP_API) — callers must tolerate it failing. */
export function sleeperAppGet<T>(path: string, options: GetOptions = {}): Promise<T> {
  return get<T>(APP_API, path, options)
}
