import type { SeasonData } from '@/data'
import { linealHistory, type LinealReign, type LinealTitleGame } from './lineal'

/** How far back the belt's chain of custody is shown — enough to read a story, short enough to fit. */
const CHAIN_LENGTH = 5

/**
 * The belt, as of one week — the recap item nobody else's league can print.
 *
 * The lineage is walked over EVERY season (see `linealHistory`), because who holds it this week is
 * the end of an unbroken chain back to the first title. The week only decides which title game, if
 * any, is the news.
 */
export interface BeltWatch {
  holderId: string
  /** Successful defenses in the current reign. */
  defenses: number
  /** League weeks the current holder has had it. */
  weeksHeld: number
  /** The holder's game that week, when they played one — the belt was on the line. */
  bout: LinealTitleGame | undefined
  /** Who it was taken from, when it changed hands in this week. */
  tookItFrom: string | undefined
  /**
   * The last few reigns, oldest first, ending with the current holder — the chain of custody.
   * Each link carries what won it (`wonBout`) and how long it was held, so the block can show how
   * the belt travelled rather than only where it sits.
   */
  chain: LinealReign[]
  /** True when the lineage runs back further than the chain shows. */
  truncated: boolean
}

/**
 * The belt as it stood after `week` of `year`.
 *
 * Null when the lineage can't be built at all (no completed season yet). The holder is always the
 * CURRENT one, so a recap of an old week still reports today's champion — the block is a standing
 * item, and `bout` carries what actually happened in the week asked about.
 */
export function beltWatch(seasons: SeasonData[], year: string, week: number): BeltWatch | null {
  const { reigns, currentChampionId } = linealHistory(seasons)
  const reign = reigns.at(-1)
  if (reign === undefined || currentChampionId === null) return null

  // The title game of that week, whoever was holding it at the time.
  const bout = reigns
    .flatMap((r) => r.titleGames)
    .find((game) => game.year === year && game.week === week)
  // It changed hands that week only if the reign that began there began with that game.
  const tookItFrom =
    reign.wonAt.year === year && reign.wonAt.week === week && reign.wonFrom !== null ? reign.wonFrom : undefined

  return {
    holderId: currentChampionId,
    defenses: reign.defenses,
    weeksHeld: reign.weeksHeld,
    bout,
    tookItFrom,
    chain: reigns.slice(-CHAIN_LENGTH),
    truncated: reigns.length > CHAIN_LENGTH,
  }
}
