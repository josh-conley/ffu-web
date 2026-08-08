import { draftDateTime, ordinal } from './format'

describe('ordinal', () => {
  it('picks the right suffix, including the teens', () => {
    expect([1, 2, 3, 4, 9].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '9th'])
    expect([11, 12, 13].map(ordinal)).toEqual(['11th', '12th', '13th'])
    expect([21, 22, 23, 101].map(ordinal)).toEqual(['21st', '22nd', '23rd', '101st'])
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
