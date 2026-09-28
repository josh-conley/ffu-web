import { tierRank, type Tier } from '@/config'
import type { MemberSeason } from './career'

// A member's up/down history between tiers (Members page). The promotion/relegation itself is the
// STORED flag on each season (`promoted` / `relegated`, set at the end of a played season) — a fact,
// not something we re-derive from finishes. A tier change with no flag behind it is still shown, as
// an unflagged move: the flags only exist from 2021 on, and the 2022 expansion that added Masters
// placed teams into it without one. Nothing here is stored.

export type TierMoveKind = 'promoted' | 'relegated' | 'moved-up' | 'moved-down' | 'returned'

export interface TierMove {
  /** The season the move came out of. */
  year: string
  from: Tier
  /** Where they played next, and when; absent if they haven't played a season since. */
  to?: { year: string; tier: Tier }
  kind: TierMoveKind
}

function kindOf(season: MemberSeason, next: MemberSeason | undefined): TierMoveKind | undefined {
  if (season.team.promoted) return 'promoted'
  if (season.team.relegated) return 'relegated'
  if (next === undefined || next.tier === season.tier) return undefined
  if (Number(next.year) - Number(season.year) > 1) return 'returned'
  return tierRank(next.tier) < tierRank(season.tier) ? 'moved-up' : 'moved-down'
}

/** Every flagged move and every tier change, oldest first. `history` is `memberSeasons`' output. */
export function tierMoves(history: MemberSeason[]): TierMove[] {
  const rows = [...history].sort((a, b) => Number(a.year) - Number(b.year))
  const out: TierMove[] = []
  rows.forEach((season, i) => {
    const next = rows[i + 1]
    const kind = kindOf(season, next)
    if (kind === undefined) return
    out.push({ year: season.year, from: season.tier, ...(next && { to: { year: next.year, tier: next.tier } }), kind })
  })
  return out
}
