import type { Tier } from '@/config/types'
import type { DraftSchedule } from './types'
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
}

/** The most recently created draft for a league — Sleeper returns an array (redrafts/mocks add rows). */
function latestDraft(drafts: SleeperDraft[]): SleeperDraft | undefined {
  return drafts.reduce<SleeperDraft | undefined>((best, d) => (!best || d.created > best.created ? d : best), undefined)
}

export async function fetchDraftSchedule(tier: Tier, year: string, leagueId: string): Promise<DraftSchedule> {
  const drafts = await sleeperGet<SleeperDraft[]>(`/league/${leagueId}/drafts`)
  if (!Array.isArray(drafts)) throw new Error(`Sleeper league/${leagueId}/drafts: not an array`)
  const draft = latestDraft(drafts)
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
