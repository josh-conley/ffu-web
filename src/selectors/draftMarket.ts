import type { Tier } from '@/config/types'
import type { DraftData, DraftPlayer } from '@/data'

// Comparing draft boards against two different baselines.
//
//  - FFU ADP: where the three leagues took a player on average. Derived from the draft files, so
//    it always exists, and it is the more pointed comparison — it is these twelve managers.
//  - Sleeper ADP: the wider half-PPR market as it stood around draft time, from the snapshot in
//    public/data/{year}/adp.json. Optional; absent for every year nobody captured one.
//
// A pick is a "reach" when it came earlier than the baseline and a "value" when it fell later.

export interface MarketPick {
  tier: Tier
  overall: number
  round: number
  memberId: string
}

export interface PlayerMarket {
  player: DraftPlayer
  /** Every league that drafted them, in pick order. */
  picks: MarketPick[]
  /** Mean overall pick across those leagues — the FFU ADP. */
  ffuAdp: number
  /** Earliest and latest a league took them; equal when only one did. */
  earliest: number
  latest: number
}

export type AdpMap = Record<string, number>

export interface PickComparison extends MarketPick {
  player: DraftPlayer
  /**
   * Mean pick in the OTHER leagues — the field this pick is measured against.
   *
   * Deliberately excludes the pick being judged. With only three leagues, including it drags every
   * baseline a third of the way toward the pick itself and flattens exactly the disagreements the
   * page exists to show: Josh Jacobs at 52 against a field of 115 is a 63-slot reach, but only a
   * 42-slot one if his own pick is folded into the average he is compared with.
   */
  fieldAdp: number
  /** `fieldAdp - overall`. Positive = taken EARLIER than the field (a reach); negative = a value. */
  delta: number
  /** Sleeper's half-PPR ADP, when a snapshot covers this player. */
  adp?: number
  /** `adp - overall`, same sign convention as `delta`. Undefined without an ADP. */
  adpDelta?: number
}

const mean = (ns: number[]) => ns.reduce((a, b) => a + b, 0) / ns.length

/** One row per player drafted anywhere, with where each league took them. */
export function playerMarkets(drafts: DraftData[]): PlayerMarket[] {
  const byPlayer = new Map<string, { player: DraftPlayer; picks: MarketPick[] }>()
  for (const draft of drafts) {
    for (const pick of draft.picks) {
      const entry = byPlayer.get(pick.player.id) ?? { player: pick.player, picks: [] }
      entry.picks.push({ tier: draft.tier, overall: pick.overall, round: pick.round, memberId: pick.memberId })
      byPlayer.set(pick.player.id, entry)
    }
  }
  return [...byPlayer.values()].map(({ player, picks }) => {
    const sorted = [...picks].sort((a, b) => a.overall - b.overall)
    const overalls = sorted.map((p) => p.overall)
    return {
      player,
      picks: sorted,
      ffuAdp: mean(overalls),
      earliest: overalls[0] as number,
      latest: overalls[overalls.length - 1] as number,
    }
  })
}

/**
 * Every pick that can be compared with something — i.e. of a player at least two leagues drafted.
 * A player only one league took has no field to measure against and is left out rather than
 * reported as a delta of zero, which would read as "exactly on ADP" when it means "no data".
 */
export function pickComparisons(markets: PlayerMarket[], adp: AdpMap = {}): PickComparison[] {
  const out: PickComparison[] = []
  for (const { player, picks } of markets) {
    if (picks.length < 2) continue
    for (const pick of picks) {
      const fieldAdp = mean(picks.filter((p) => p !== pick).map((p) => p.overall))
      const market = adp[player.id]
      out.push({
        ...pick,
        player,
        fieldAdp,
        delta: fieldAdp - pick.overall,
        ...(market === undefined ? {} : { adp: market, adpDelta: market - pick.overall }),
      })
    }
  }
  return out
}

/** Which baseline a reach/value is measured against. */
export type Baseline = 'ffu' | 'sleeper'

/** The delta for one baseline; undefined when that baseline has nothing for this pick. */
export const deltaFor = (c: PickComparison, baseline: Baseline): number | undefined =>
  baseline === 'ffu' ? c.delta : c.adpDelta

/**
 * Picks that went one side of the baseline, furthest first.
 *
 * Every one of them, not a top ten: the tables page, so the extremes still lead and the long tail
 * stays reachable. Picks exactly ON the baseline are in neither list — they are the definition of
 * neither a reach nor a value — and `limit` is left for callers that genuinely want a preview.
 */
const ranked = (comparisons: PickComparison[], baseline: Baseline, sign: 1 | -1, limit?: number) => {
  const rows = comparisons
    .filter((c) => {
      const delta = deltaFor(c, baseline)
      return delta !== undefined && Math.sign(delta) === sign
    })
    .sort((a, b) => sign * ((deltaFor(b, baseline) as number) - (deltaFor(a, baseline) as number)))
  return limit === undefined ? rows : rows.slice(0, limit)
}

/** Every pick taken ahead of the baseline, biggest reach first. */
export const biggestReaches = (comparisons: PickComparison[], limit?: number, baseline: Baseline = 'ffu') =>
  ranked(comparisons, baseline, 1, limit)

/** Every pick that fell past the baseline, biggest value first. */
export const biggestValues = (comparisons: PickComparison[], limit?: number, baseline: Baseline = 'ffu') =>
  ranked(comparisons, baseline, -1, limit)

/** A player's pick in one tier, for the side-by-side board. */
export const pickIn = (market: PlayerMarket, tier: Tier): MarketPick | undefined =>
  market.picks.find((p) => p.tier === tier)

/** Positions present across the drafts, in canonical order — for the page's filter. */
const POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
export function marketPositions(markets: PlayerMarket[]): string[] {
  const present = new Set(markets.map((m) => m.player.position).filter(Boolean))
  return [...present].sort((a, b) => {
    const ia = POS_ORDER.indexOf(a)
    const ib = POS_ORDER.indexOf(b)
    return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib) || a.localeCompare(b)
  })
}
