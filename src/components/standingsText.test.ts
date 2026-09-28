import { baseRateSentence } from './standingsText'

describe('baseRateSentence', () => {
  const rates = { week: 3, since: '2018', byRecord: new Map() }

  it('reads as history, with the counts', () => {
    expect(baseRateSentence(rates, '2-1', { made: 58, total: 83 })).toBe('Since 2018, teams 2-1 after 3 weeks made the playoffs 58 of 83 times')
  })

  it('gets the singular right', () => {
    expect(baseRateSentence(rates, '3-0-1', { made: 1, total: 1 })).toBe('Since 2018, teams 3-0-1 after 3 weeks made the playoffs 1 of 1 time')
  })
})
