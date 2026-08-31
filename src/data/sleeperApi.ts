// Shared HTTP helper for the client-side Sleeper reads (liveSleeper = in-progress scoring,
// liveRosters = who's in each league, liveDrafts = the draft board as it happens). One base url and
// one error shape for all of them (Charter DRY).

const API = 'https://api.sleeper.app/v1'

interface GetOptions {
  /**
   * Bypass the browser's HTTP cache. Sleeper answers without a `max-age`, which leaves a private
   * cache free to reuse a response on its own heuristics — fine for a season's finished data, wrong
   * for anything being polled while it changes (a draft in progress). Their CDN still caps how
   * fresh the answer can be; this just stops us re-reading our own copy of it.
   */
  fresh?: boolean
}

export async function sleeperGet<T>(path: string, { fresh }: GetOptions = {}): Promise<T> {
  const url = `${API}${path}`
  const res = fresh ? await fetch(url, { cache: 'no-store' }) : await fetch(url)
  if (!res.ok) throw new Error(`Sleeper ${path} -> HTTP ${res.status}`)
  return res.json() as Promise<T>
}
