// Persistence for pick'em entries, behind an interface so the routes are tested against an
// in-memory store (store.memory.ts) and run against D1 in production. Only the methods the routes
// need; the SQL lives here and nowhere else.

export interface StoredEntry {
  ffuId: string
  /** '' = an entry saved before PINs existed (migration 0002): its next save sets the PIN. */
  pinHash: string
  pinSalt: string
  /** The validated CupPicks, as JSON. */
  picks: string
  createdAt: number
  updatedAt: number
}

export interface EntryStore {
  list(year: string): Promise<StoredEntry[]>
  get(year: string, ffuId: string): Promise<StoredEntry | null>
  /**
   * Creates the entry, or sets the PIN on a pre-PIN one. False when the team already has a PIN'd
   * entry (a concurrent first save won). One statement, so two first saves can't both win.
   */
  create(year: string, entry: StoredEntry): Promise<boolean>
  savePicks(year: string, ffuId: string, picks: string, now: number): Promise<void>
}

// The slice of Cloudflare's D1 binding used here, typed locally rather than pulling in the whole
// @cloudflare/workers-types package for a handful of methods.
interface D1Statement {
  bind(...values: unknown[]): D1Statement
  first<T>(): Promise<T | null>
  all<T>(): Promise<{ results: T[] }>
  run(): Promise<{ meta: { changes: number } }>
}
export interface D1Database {
  prepare(sql: string): D1Statement
}

interface Row {
  ffu_id: string
  pin_hash: string
  pin_salt: string
  picks: string
  created_at: number
  updated_at: number
}

const fromRow = (r: Row): StoredEntry => ({
  ffuId: r.ffu_id,
  pinHash: r.pin_hash,
  pinSalt: r.pin_salt,
  picks: r.picks,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

export function d1Store(db: D1Database): EntryStore {
  return {
    async list(year) {
      const { results } = await db.prepare('SELECT * FROM entries WHERE year = ? ORDER BY created_at').bind(year).all<Row>()
      return results.map(fromRow)
    },
    async get(year, ffuId) {
      const row = await db.prepare('SELECT * FROM entries WHERE year = ? AND ffu_id = ?').bind(year, ffuId).first<Row>()
      return row ? fromRow(row) : null
    },
    async create(year, e) {
      const { meta } = await db
        .prepare(
          `INSERT INTO entries (year, ffu_id, pin_hash, pin_salt, picks, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (year, ffu_id) DO UPDATE SET pin_hash = excluded.pin_hash, pin_salt = excluded.pin_salt,
             picks = excluded.picks, updated_at = excluded.updated_at
           WHERE entries.pin_hash = ''`,
        )
        .bind(year, e.ffuId, e.pinHash, e.pinSalt, e.picks, e.createdAt, e.updatedAt)
        .run()
      return meta.changes > 0
    },
    async savePicks(year, ffuId, picks, now) {
      await db.prepare('UPDATE entries SET picks = ?, updated_at = ? WHERE year = ? AND ffu_id = ?').bind(picks, now, year, ffuId).run()
    },
  }
}
