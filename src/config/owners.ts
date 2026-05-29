import type { Owner } from './types'

/**
 * Real people who manage teams — display-only (season data never references owners; they're
 * linked from MEMBERS via `owners[].ownerId`). Populated incrementally as names are collected.
 *
 * TODO(owners): still gathering the rest. As each arrives, add an entry here and set the
 * matching member's `owners` in members.ts. Co-owned teams (e.g. Team Dogecoin / ffu-031) get
 * a primary + secondary owner.
 */
export const OWNERS: Owner[] = [
  { id: 'owner-001', firstName: 'Josh', lastInitial: 'C' }, // The Minutemen (ffu-023)
]
