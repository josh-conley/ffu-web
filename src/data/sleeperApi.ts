// Shared HTTP helper for the client-side Sleeper reads (liveSleeper = in-progress scoring,
// liveRosters = who's in each league). One base url and one error shape for both (Charter DRY).

const API = 'https://api.sleeper.app/v1'

export async function sleeperGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`Sleeper ${path} -> HTTP ${res.status}`)
  return res.json() as Promise<T>
}
