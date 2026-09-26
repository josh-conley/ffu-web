import type { SeasonData } from '@/data'
import { linealHistory } from './lineal'

const lastWeekOnFile = (season: SeasonData) => Math.max(0, ...season.games.map((g) => g.week))

/**
 * Who carries the lineal belt INTO `week` of `year` — the one team whose game that week puts the
 * title on the line. Null unless it can be said for certain.
 *
 * The lineage is derived from stored games, and the file only gains a week once it's complete, so
 * the holder going into week N is only known when every tier of that year runs exactly through
 * week N−1. When the file lags (last week hasn't been refreshed in yet) the belt may already have
 * moved on a result we can't see, so we'd rather mark nothing than the wrong game. When the file
 * already holds week N, that game is played and the lineage has moved past it. A later season with
 * games means `year` isn't the one being played.
 */
export function linealHolderGoingInto(seasons: SeasonData[], year: string, week: number): string | null {
  const ofYear = seasons.filter((s) => s.year === year)
  const upToDate = ofYear.every((s) => lastWeekOnFile(s) === week - 1) && (ofYear.length > 0 || week === 1)
  const later = seasons.some((s) => s.year > year && s.games.length > 0)
  return upToDate && !later ? linealHistory(seasons).currentChampionId : null
}
