import type { EntryStore, StoredEntry } from './store'

/** In-memory EntryStore with the same semantics as the D1 one — for tests and nothing else. */
export function memoryStore(): EntryStore & { rows: Map<string, StoredEntry> } {
  const rows = new Map<string, StoredEntry>()
  const k = (year: string, ffuId: string) => `${year}/${ffuId}`
  return {
    rows,
    async list(year) {
      return [...rows].filter(([key]) => key.startsWith(`${year}/`)).map(([, e]) => ({ ...e }))
    },
    async get(year, ffuId) {
      const e = rows.get(k(year, ffuId))
      return e ? { ...e } : null
    },
    async create(year, entry) {
      if (rows.has(k(year, entry.ffuId))) return false
      rows.set(k(year, entry.ffuId), { ...entry, failedAttempts: 0, lockedUntil: null })
      return true
    },
    async savePicks(year, ffuId, picks, now) {
      const e = rows.get(k(year, ffuId))
      if (e) rows.set(k(year, ffuId), { ...e, picks, updatedAt: now })
    },
    async claimAttempt(year, ffuId, now, maxFailures, lockUntil) {
      const e = rows.get(k(year, ffuId))
      if (!e || (e.lockedUntil !== null && e.lockedUntil > now)) return false
      const failedAttempts = e.failedAttempts + 1
      rows.set(k(year, ffuId), { ...e, failedAttempts, lockedUntil: failedAttempts >= maxFailures ? lockUntil : e.lockedUntil })
      return true
    },
    async clearAttempts(year, ffuId) {
      const e = rows.get(k(year, ffuId))
      if (e) rows.set(k(year, ffuId), { ...e, failedAttempts: 0, lockedUntil: null })
    },
    async remove(year, ffuId) {
      return rows.delete(k(year, ffuId))
    },
  }
}
