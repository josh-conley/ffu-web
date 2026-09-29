import { draftDateTime, formatPoints, gameNote, ordinal, recordLabel, recordRatingLabel, shortPlayerName } from './format'

describe('ordinal', () => {
  it('picks the right suffix, including the teens', () => {
    expect([1, 2, 3, 4, 9].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '9th'])
    expect([11, 12, 13].map(ordinal)).toEqual(['11th', '12th', '13th'])
    expect([21, 22, 23, 101].map(ordinal)).toEqual(['21st', '22nd', '23rd', '101st'])
  })
})

describe('formatPoints', () => {
  it('shows hundredths and groups thousands', () => {
    expect(formatPoints(13662.5)).toBe('13,662.50')
    expect(formatPoints(118.444)).toBe('118.44')
    expect(formatPoints(0)).toBe('0.00')
    expect(formatPoints(1234567.891)).toBe('1,234,567.89')
  })

  it('keeps the sign on negatives (a point differential)', () => {
    expect(formatPoints(-1520.256)).toBe('-1,520.26')
  })
})

describe('recordRatingLabel', () => {
  it('pairs the record with points per game before there is a UPR, and says nothing before the first game', () => {
    expect(recordRatingLabel({ wins: 2, losses: 1, ties: 0, average: 118.44 }, undefined)).toBe('2-1 · 118.4 PPG')
    expect(recordRatingLabel({ wins: 1, losses: 1, ties: 1, average: 101 }, undefined)).toBe('1-1-1 · 101.0 PPG')
    expect(recordRatingLabel({ wins: 0, losses: 0, ties: 0, average: 0 }, undefined)).toBeUndefined()
  })

  it('shows the UPR in place of PPG once there is one', () => {
    expect(recordRatingLabel({ wins: 2, losses: 1, ties: 0, average: 118.44 }, 108.4)).toBe('2-1 · 108.40 UPR')
  })
})

describe('recordLabel', () => {
  it('shows ties only when there are any', () => {
    expect(recordLabel({ wins: 7, losses: 6, ties: 0 })).toBe('7-6')
    expect(recordLabel({ wins: 7, losses: 6, ties: 1 })).toBe('7-6-1')
  })
})

describe('shortPlayerName', () => {
  it('reduces the first name to an initial', () => {
    expect(shortPlayerName('Christian McCaffrey')).toBe('C. McCaffrey')
  })

  it('keeps everything after the first name, suffixes included', () => {
    expect(shortPlayerName('Marvin Harrison Jr.')).toBe('M. Harrison Jr.')
  })

  it('leaves a single-word name alone (team defenses, mononyms)', () => {
    expect(shortPlayerName('Bengals')).toBe('Bengals')
    expect(shortPlayerName('SF')).toBe('SF')
  })

  it('is unfazed by stray whitespace', () => {
    expect(shortPlayerName('  Puka  Nacua ')).toBe('P. Nacua')
  })
})

describe('draftDateTime', () => {
  // Asserted by shape, not by literal string: the output is intentionally rendered in the viewer's
  // timezone, so a fixed expectation would only pass on whatever machine wrote it.
  it('renders "Wkd, Mon D · h:mm AM/PM ZONE"', () => {
    expect(draftDateTime(1787445046000)).toMatch(/^\w{3}, \w{3} \d{1,2} · \d{1,2}:\d{2} (AM|PM) .+$/)
  })

  it('reflects the actual instant, to the minute', () => {
    const hourLater = draftDateTime(1787445046000 + 60 * 60 * 1000)
    expect(hourLater).not.toBe(draftDateTime(1787445046000))
  })
})

describe('gameNote', () => {
  it('gives the kickoff (viewer\'s timezone) then the opponent before the game', () => {
    expect(gameNote({ status: 'pre', kickoff: 1790528400000, opponent: 'vs PHI' })).toMatch(/^\w{3} \d{1,2}:\d{2}\s?(AM|PM) vs PHI$/)
    expect(gameNote({ status: 'pre', opponent: 'vs DAL' })).toBe('vs DAL')
  })

  it('gives the quarter and clock then the opponent while it is on', () => {
    expect(gameNote({ status: 'live', quarter: 3, clock: '07:30', opponent: 'vs MIA' })).toBe('Q3 7:30 vs MIA')
    expect(gameNote({ status: 'live', quarter: 2, clock: '00:00', opponent: '@ BUF' })).toBe('Half @ BUF')
    expect(gameNote({ status: 'live', quarter: 5, clock: '04:12', opponent: '@ BUF' })).toBe('OT 4:12 @ BUF')
    expect(gameNote({ status: 'live', opponent: '@ BUF' })).toBe('Live @ BUF')
  })

  it('says Final then the opponent once the game is over', () => {
    expect(gameNote({ status: 'final', kickoff: 1790528400000, opponent: '@ BUF' })).toBe('Final @ BUF')
  })
})
