import type { SeasonMeta } from './types'

/**
 * Season registry — generated once from legacy ffu-app LEAGUES, now hand-maintained.
 * era is folded in (<=2020 espn, else sleeper); hasDivisions is true only for 2025.
 * seasonLength/playoffWeeks are omitted (derived from era — see eraInfo helpers).
 */
export const SEASONS: SeasonMeta[] = [
  { tier: 'PREMIER', year: '2025', era: 'sleeper', platformLeagueId: '1256010768692805632', hasDivisions: true },
  { tier: 'PREMIER', year: '2024', era: 'sleeper', platformLeagueId: '1124841088360660992', hasDivisions: false },
  { tier: 'PREMIER', year: '2023', era: 'sleeper', platformLeagueId: '989237166217723904', hasDivisions: false },
  { tier: 'PREMIER', year: '2022', era: 'sleeper', platformLeagueId: '856271024054996992', hasDivisions: false },
  { tier: 'PREMIER', year: '2021', era: 'sleeper', platformLeagueId: '710961812656455680', hasDivisions: false },
  { tier: 'PREMIER', year: '2020', era: 'espn', platformLeagueId: 'espn-2020-premier', hasDivisions: false },
  { tier: 'PREMIER', year: '2019', era: 'espn', platformLeagueId: 'espn-2019-premier', hasDivisions: false },
  { tier: 'PREMIER', year: '2018', era: 'espn', platformLeagueId: 'espn-2018-premier', hasDivisions: false },
  { tier: 'MASTERS', year: '2025', era: 'sleeper', platformLeagueId: '1256011253583708161', hasDivisions: true },
  { tier: 'MASTERS', year: '2024', era: 'sleeper', platformLeagueId: '1124833010697379840', hasDivisions: false },
  { tier: 'MASTERS', year: '2023', era: 'sleeper', platformLeagueId: '989238596353794048', hasDivisions: false },
  { tier: 'MASTERS', year: '2022', era: 'sleeper', platformLeagueId: '856271401471029248', hasDivisions: false },
  { tier: 'NATIONAL', year: '2025', era: 'sleeper', platformLeagueId: '1256012193275576320', hasDivisions: true },
  { tier: 'NATIONAL', year: '2024', era: 'sleeper', platformLeagueId: '1124834889196134400', hasDivisions: false },
  { tier: 'NATIONAL', year: '2023', era: 'sleeper', platformLeagueId: '989240797381951488', hasDivisions: false },
  { tier: 'NATIONAL', year: '2022', era: 'sleeper', platformLeagueId: '856271753788403712', hasDivisions: false },
  { tier: 'NATIONAL', year: '2021', era: 'sleeper', platformLeagueId: '726573082608775168', hasDivisions: false },
  { tier: 'NATIONAL', year: '2020', era: 'espn', platformLeagueId: 'espn-2020-national', hasDivisions: false },
  { tier: 'NATIONAL', year: '2019', era: 'espn', platformLeagueId: 'espn-2019-national', hasDivisions: false },
  { tier: 'NATIONAL', year: '2018', era: 'espn', platformLeagueId: 'espn-2018-national', hasDivisions: false },
]
