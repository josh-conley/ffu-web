import { ordinal } from './format'

describe('ordinal', () => {
  it('picks the right suffix, including the teens', () => {
    expect([1, 2, 3, 4, 9].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '9th'])
    expect([11, 12, 13].map(ordinal)).toEqual(['11th', '12th', '13th'])
    expect([21, 22, 23, 101].map(ordinal)).toEqual(['21st', '22nd', '23rd', '101st'])
  })
})
