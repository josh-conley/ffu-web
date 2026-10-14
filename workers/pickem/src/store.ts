// Persistence for pick'em entries, behind an interface so the routes are tested against an
// in-memory store (store.memory.ts) and run against D1 in production. Only the methods the routes
// need; the SQL lives here and nowhere else.

export interface StoredEntry {
  ffuId: string
  /** The validated CupPicks, as JSON. */
  picks: string
  createdAt: number
  updatedAt: number
}

export interface EntryStore {
  list(year: string): Promise<StoredEntry[]>
  /** Saves the team's picks, creating its entry or replacing the one there. */
  upsert(year: string, ffuId: string, picks: string, now: number): Promise<void>
  remove(year: string, ffuId: string): Promise<boolean>
}

// The slice of Cloudflare's D1 binding used here, typed locally rather than pulling in the whole
// @cloudflare/workers-types package for a handful of methods.
interface D1Statement {
  bind(...values: unknown[]): D1Statement
  all<T>(): Promise<{ results: T[] }>
  run(): Promise<{ meta: { changes: number } }>
}
export interface D1Database {
  prepare(sql: string): D1Statement
}

interface Row {
  ffu_id: string
  picks: string
  created_at: number
  updated_at: number
}

export function d1Store(db: D1Database): EntryStore {
  return {
    async list(year) {
      const { results } = await db.prepare('SELECT * FROM entries WHERE year = ? ORDER BY created_at').bind(year).all<Row>()
      return results.map((r) => ({ ffuId: r.ffu_id, picks: r.picks, createdAt: r.created_at, updatedAt: r.updated_at }))
    },
    async upsert(year, ffuId, picks, now) {
      await db
        .prepare(
          `INSERT INTO entries (year, ffu_id, picks, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT (year, ffu_id) DO UPDATE SET picks = excluded.picks, updated_at = excluded.updated_at`,
        )
        .bind(year, ffuId, picks, now, now)
        .run()
    },
    async remove(year, ffuId) {
      const { meta } = await db.prepare('DELETE FROM entries WHERE year = ? AND ffu_id = ?').bind(year, ffuId).run()
      return meta.changes > 0
    },
  }
}
