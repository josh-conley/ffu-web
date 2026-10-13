// Persistence for pick'em entries, behind an interface so the routes are tested against an
// in-memory store (store.memory.ts) and run against D1 in production. Only the methods the routes
// need; the SQL lives here and nowhere else.

export interface StoredEntry {
  ffuId: string
  pinHash: string
  pinSalt: string
  /** The validated CupPicks, as JSON. */
  picks: string
  createdAt: number
  updatedAt: number
  failedAttempts: number
  lockedUntil: number | null
}

export interface EntryStore {
  list(year: string): Promise<StoredEntry[]>
  get(year: string, ffuId: string): Promise<StoredEntry | null>
  /** False when the entry already exists (a concurrent first save won). */
  create(year: string, entry: StoredEntry): Promise<boolean>
  savePicks(year: string, ffuId: string, picks: string, now: number): Promise<void>
  /**
   * Counts a PIN attempt BEFORE it is checked, atomically, so a burst of parallel guesses can't all
   * read "not locked" and slip past the cap. False = locked out right now (nothing counted). Once
   * `maxFailures` attempts are on the count, every further attempt also locks until `lockUntil`.
   */
  claimAttempt(year: string, ffuId: string, now: number, maxFailures: number, lockUntil: number): Promise<boolean>
  /** A right PIN: the count starts over. */
  clearAttempts(year: string, ffuId: string): Promise<void>
  remove(year: string, ffuId: string): Promise<boolean>
}

// The slice of Cloudflare's D1 binding used here, typed locally rather than pulling in the whole
// @cloudflare/workers-types package for five methods.
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
  failed_attempts: number
  locked_until: number | null
}

const fromRow = (r: Row): StoredEntry => ({
  ffuId: r.ffu_id,
  pinHash: r.pin_hash,
  pinSalt: r.pin_salt,
  picks: r.picks,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  failedAttempts: r.failed_attempts,
  lockedUntil: r.locked_until,
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
          `INSERT INTO entries (year, ffu_id, pin_hash, pin_salt, picks, created_at, updated_at, failed_attempts, locked_until)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL) ON CONFLICT (year, ffu_id) DO NOTHING`,
        )
        .bind(year, e.ffuId, e.pinHash, e.pinSalt, e.picks, e.createdAt, e.updatedAt)
        .run()
      return meta.changes > 0
    },
    async savePicks(year, ffuId, picks, now) {
      await db.prepare('UPDATE entries SET picks = ?, updated_at = ? WHERE year = ? AND ffu_id = ?').bind(picks, now, year, ffuId).run()
    },
    async claimAttempt(year, ffuId, now, maxFailures, lockUntil) {
      // One statement, which D1 runs serially with every other write: the lock check and the count
      // can't be interleaved by a concurrent attempt.
      const { meta } = await db
        .prepare(
          `UPDATE entries SET failed_attempts = failed_attempts + 1,
             locked_until = CASE WHEN failed_attempts + 1 >= ? THEN ? ELSE locked_until END
           WHERE year = ? AND ffu_id = ? AND (locked_until IS NULL OR locked_until <= ?)`,
        )
        .bind(maxFailures, lockUntil, year, ffuId, now)
        .run()
      return meta.changes > 0
    },
    async clearAttempts(year, ffuId) {
      await db.prepare('UPDATE entries SET failed_attempts = 0, locked_until = NULL WHERE year = ? AND ffu_id = ?').bind(year, ffuId).run()
    },
    async remove(year, ffuId) {
      const { meta } = await db.prepare('DELETE FROM entries WHERE year = ? AND ffu_id = ?').bind(year, ffuId).run()
      return meta.changes > 0
    },
  }
}
