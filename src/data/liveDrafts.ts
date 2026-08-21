import type { Tier } from '@/config/types'
import { memberBySleeperId } from '@/config'
import type { DraftOrderSlot, DraftSchedule, LiveDraftOrder } from './types'
import { sleeperGet } from './sleeperApi'

// Client-side read of "when is each league's draft" (see src/data/liveSleeper.ts for why the live
// path sits outside LeagueDataProvider). Sleeper creates a draft object with the league itself, so
// this works from day one — `start_time` is simply null until the commissioner sets a date, which is
// why the date lives here rather than being hand-copied into config: no code change when it changes.

interface SleeperDraft {
  draft_id: string
  start_time: number | null
  status: string
  created: number
  /** Sleeper user id → 1-based slot. Null until the commissioner sets the order. */
  draft_order: Record<string, number> | null
  settings?: { rounds?: number }
}

/** The most recently created draft for a league — Sleeper returns an array (redrafts/mocks add rows). */
function latestDraft(drafts: SleeperDraft[]): SleeperDraft | undefined {
  return drafts.reduce<SleeperDraft | undefined>((best, d) => (!best || d.created > best.created ? d : best), undefined)
}

async function fetchLatestDraft(leagueId: string): Promise<SleeperDraft | undefined> {
  const drafts = await sleeperGet<SleeperDraft[]>(`/league/${leagueId}/drafts`)
  if (!Array.isArray(drafts)) throw new Error(`Sleeper league/${leagueId}/drafts: not an array`)
  return latestDraft(drafts)
}

export async function fetchDraftSchedule(tier: Tier, year: string, leagueId: string): Promise<DraftSchedule> {
  const draft = await fetchLatestDraft(leagueId)
  return {
    tier,
    year,
    startTime: typeof draft?.start_time === 'number' ? draft.start_time : null,
    status: draft?.status ?? 'pre_draft',
  }
}

/** Every configured tier for `year`, fetched in parallel; tier order follows `leagueIds`. */
export async function fetchDraftSchedules(year: string, leagueIds: Partial<Record<Tier, string>>): Promise<DraftSchedule[]> {
  const entries = Object.entries(leagueIds) as [Tier, string][]
  return Promise.all(entries.map(([tier, leagueId]) => fetchDraftSchedule(tier, year, leagueId)))
}


/**
 * Who drafts where. Sleeper hands back `draft_order` as user id → slot, so the slot list is sorted
 * back into pick order here. A slot whose Sleeper account isn't in the registry keeps its place with
 * no `ffuId` (and is counted) — the same forgiving treatment liveRosters gives, since a missing
 * mapping shouldn't punch a hole in the published order.
 */
/** Sleeper's `{ userId: slot }` → slots in pick order, each resolved to a registry member. */
function toSlots(tier: Tier, order: Record<string, number> | null): { slots: DraftOrderSlot[]; unregistered: number } {
  if (!order) return { slots: [], unregistered: 0 }
  const slots: DraftOrderSlot[] = []
  let unregistered = 0
  for (const [sleeperId, slot] of Object.entries(order)) {
    const member = memberBySleeperId(sleeperId)
    if (!member) {
      console.warn(`[liveDrafts] ${tier} draft slot ${slot} (user ${sleeperId}) has no matching Member yet`)
      unregistered++
    }
    slots.push({ slot, ffuId: member?.ffuId })
  }
  slots.sort((a, b) => a.slot - b.slot)
  return { slots, unregistered }
}

export async function fetchDraftOrder(tier: Tier, year: string, leagueId: string): Promise<LiveDraftOrder> {
  const draft = await fetchLatestDraft(leagueId)
  const { slots, unregistered } = toSlots(tier, draft?.draft_order ?? null)
  return {
    tier,
    year,
    status: draft?.status ?? 'pre_draft',
    startTime: typeof draft?.start_time === 'number' ? draft.start_time : null,
    rounds: draft?.settings?.rounds ?? 0,
    slots,
    unregistered,
  }
}
