import { LIVE_LEAGUE_IDS, nameForYear, type Tier } from '@/config'
import type { LiveDraftOrder } from '@/data'
import type { CupField } from '@/lib/cupDraw.mjs'
import { useDraftOrder } from './useDraftOrder'

const TIERS: Tier[] = ['PREMIER', 'MASTERS', 'NATIONAL']

export interface CupFieldState {
  field: CupField | undefined
  loading: boolean
  /** Why the field can't be drawn yet — shown to the operator instead of a broken draw. */
  problem: string | undefined
}

/**
 * The 36 teams, ready for the draw: Premier and Masters in DRAFT ORDER (which sets both who draws
 * first and their seeds), National in any order since it never draws.
 *
 * Refuses to hand back a partial field. A slot with no registry member, or a tier whose order the
 * commissioner hasn't set, means the draw would be wrong rather than merely incomplete — so it
 * reports the problem and the page blocks on it.
 */
/** Fills one tier into `field`, or returns why it can't be. */
function fill(field: CupField, tier: Tier, order: LiveDraftOrder | undefined, year: string): string | undefined {
  if (!order || order.slots.length === 0) return `${tier}: draft order is not set on Sleeper yet.`
  if (order.unregistered > 0) return `${tier}: ${order.unregistered} manager(s) are not in the member registry yet.`
  if (order.slots.length !== 12) return `${tier}: expected 12 teams, found ${order.slots.length}.`
  field[tier] = order.slots.map((s) => {
    const ffuId = s.ffuId as string
    return { ffuId, name: nameForYear(ffuId, year) ?? ffuId }
  })
  return undefined
}

export function useCupField(year: string): CupFieldState {
  const enabled = LIVE_LEAGUE_IDS[year] !== undefined
  const premier = useDraftOrder('PREMIER', year, enabled)
  const masters = useDraftOrder('MASTERS', year, enabled)
  const national = useDraftOrder('NATIONAL', year, enabled)
  const byTier = { PREMIER: premier, MASTERS: masters, NATIONAL: national }

  if (!enabled) return { field: undefined, loading: false, problem: `${year} has no Sleeper leagues configured.` }
  if (premier.loading || masters.loading || national.loading) return { field: undefined, loading: true, problem: undefined }

  const error = premier.error ?? masters.error ?? national.error
  if (error) return { field: undefined, loading: false, problem: `Could not reach Sleeper: ${error.message}` }

  const field = {} as CupField
  for (const tier of TIERS) {
    const problem = fill(field, tier, byTier[tier].order, year)
    if (problem) return { field: undefined, loading: false, problem }
  }
  return { field, loading: false, problem: undefined }
}
