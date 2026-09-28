import type { BaseRate, PlayoffBaseRates } from '@/selectors'

// Wording for the Standings cut lines, kept apart from the marks so it can be tested as text.

export const PICTURE_CAPTION = 'If the season ended today. DIV = division leader, WC = wildcard.'

/** "Since 2018, teams 2-1 after 3 weeks made the playoffs 58 of 83 times." */
export function baseRateSentence(rates: PlayoffBaseRates, record: string, rate: BaseRate): string {
  const times = rate.total === 1 ? 'time' : 'times'
  return `Since ${rates.since ?? 'the start'}, teams ${record} after ${rates.week} weeks made the playoffs ${rate.made} of ${rate.total} ${times}`
}
