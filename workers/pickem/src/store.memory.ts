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
      const existing = rows.get(k(year, entry.ffuId))
      if (existing && existing.pinHash !== '') return false
      rows.set(k(year, entry.ffuId), { ...entry, createdAt: existing?.createdAt ?? entry.createdAt })
      return true
    },
    async savePicks(year, ffuId, picks, now) {
      const e = rows.get(k(year, ffuId))
      if (e) rows.set(k(year, ffuId), { ...e, picks, updatedAt: now })
    },
  }
}
