import { ordinal, yearRanges } from './format'

describe('ordinal', () => {
  it('picks the right suffix, including the teens', () => {
    expect([1, 2, 3, 4, 9].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '9th'])
    expect([11, 12, 13].map(ordinal)).toEqual(['11th', '12th', '13th'])
    expect([21, 22, 23, 101].map(ordinal)).toEqual(['21st', '22nd', '23rd', '101st'])
  })
})

describe('yearRanges', () => {
  it('collapses consecutive years and keeps gaps apart', () => {
    expect(yearRanges(['2018', '2019', '2021', '2022', '2023'])).toBe('2018–2019, 2021–2023')
  })

  it('leaves a single year alone', () => {
    expect(yearRanges(['2020'])).toBe('2020')
    expect(yearRanges(['2018', '2020'])).toBe('2018, 2020')
  })

  it('handles an empty list', () => {
    expect(yearRanges([])).toBe('')
  })
})
