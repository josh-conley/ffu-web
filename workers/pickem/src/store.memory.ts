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
    async upsert(year, ffuId, picks, now) {
      const existing = rows.get(k(year, ffuId))
      rows.set(k(year, ffuId), { ffuId, picks, createdAt: existing?.createdAt ?? now, updatedAt: now })
    },
    async remove(year, ffuId) {
      return rows.delete(k(year, ffuId))
    },
  }
}
