import { useMemo } from 'react'
import { LIVE_PLAYOFF_FORMAT } from '@/config'
import type { LiveSeasonData, SeasonData } from '@/data'
import {
  BASE_RATE_MIN_WEEK,
  divisionsOf,
  hasRelegation,
  livePlayoffPicture,
  playoffBaseRates,
  regularSeasonWeeksPlayed,
  seasonPlayoffPicture,
  type LiveStandingRow,
  type PlayoffBaseRates,
  type PlayoffPicture,
} from '@/selectors'
import { useAllSeasons } from './useLeagueData'

/** What a Standings table draws for a season being played: the playoff line (and, in a league
 *  with relegation, the zone below it) plus each record's history. */
export interface StandingsLines {
  picture: PlayoffPicture
  relegation: boolean
  /** Absent before week 3, and until the archive has loaded. */
  rates?: PlayoffBaseRates
}

function withRates(picture: PlayoffPicture, relegation: boolean, rates: PlayoffBaseRates | undefined): StandingsLines {
  return rates === undefined ? { picture, relegation } : { picture, relegation, rates }
}

/** The Standings page: undefined for any season not part-way through its regular season, and the
 *  archive (for base rates) is only loaded when there is a line to draw from week 3 on. */
export function useStandingsLines(season: SeasonData): StandingsLines | undefined {
  const picture = useMemo(() => seasonPlayoffPicture(season, LIVE_PLAYOFF_FORMAT), [season])
  const week = regularSeasonWeeksPlayed(season)
  const wantRates = picture !== undefined && week >= BASE_RATE_MIN_WEEK
  const { data: seasons } = useAllSeasons(wantRates)
  const rates = useMemo(() => (wantRates && seasons ? playoffBaseRates(seasons, week) : undefined), [wantRates, seasons, week])
  if (picture === undefined) return undefined
  return withRates(picture, hasRelegation(season.tier, season.year), rates)
}

/** The home page's live table. Divisions come from the season file, so nothing is drawn until the
 *  archive (which the home page loads anyway) is in — a picture without divisions would be wrong. */
export function useLiveStandingsLines(data: LiveSeasonData, rows: readonly LiveStandingRow[]): StandingsLines | undefined {
  const { data: seasons } = useAllSeasons()
  const week = data.currentWeek - 1
  return useMemo(() => {
    const season = seasons?.find((s) => s.year === data.year && s.tier === data.tier)
    if (season === undefined) return undefined
    const picture = livePlayoffPicture(data, rows, divisionsOf(season), LIVE_PLAYOFF_FORMAT)
    if (picture === undefined) return undefined
    const rates = week >= BASE_RATE_MIN_WEEK && seasons ? playoffBaseRates(seasons, week) : undefined
    return withRates(picture, hasRelegation(data.tier, data.year), rates)
  }, [seasons, data, rows, week])
}
