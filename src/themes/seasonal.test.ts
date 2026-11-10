import { holidayWeek } from './seasonal'

const at = (y: number, m: number, d: number, h = 12, min = 0) => holidayWeek(new Date(y, m - 1, d, h, min))?.id ?? null

describe('holidayWeek', () => {
  it('covers Thanksgiving week from Wednesday through the Tuesday after the games', () => {
    // 2026: Thanksgiving is Thursday Nov 26.
    expect(at(2026, 11, 24)).toBeNull()
    expect(at(2026, 11, 25, 0, 0)).toBe('thanksgiving')
    expect(at(2026, 11, 26)).toBe('thanksgiving')
    expect(at(2026, 11, 30)).toBe('thanksgiving') // Monday night game
    expect(at(2026, 12, 1, 23, 59)).toBe('thanksgiving') // the Tuesday after
    expect(at(2026, 12, 2, 0, 0)).toBeNull()
  })

  it('finds the fourth Thursday whatever day November starts on', () => {
    expect(at(2027, 11, 25)).toBe('thanksgiving') // Nov 1 is a Monday
    expect(at(2028, 11, 23)).toBe('thanksgiving') // Nov 1 is a Wednesday
    expect(at(2029, 11, 22)).toBe('thanksgiving') // Nov 1 is a Thursday: the earliest it can be
    expect(at(2029, 11, 29)).toBeNull() // a fifth Thursday is not Thanksgiving
  })

  it('covers the Wednesday-to-Tuesday week that holds Christmas Day', () => {
    // 2026: Christmas is a Friday.
    expect(at(2026, 12, 22)).toBeNull()
    expect(at(2026, 12, 23)).toBe('christmas')
    expect(at(2026, 12, 29, 23, 59)).toBe('christmas')
    expect(at(2026, 12, 30)).toBeNull()
  })

  it('handles Christmas at either end of the week', () => {
    // 2029: Christmas is a Tuesday, the last day of its week.
    expect(at(2029, 12, 19)).toBe('christmas')
    expect(at(2029, 12, 25)).toBe('christmas')
    expect(at(2029, 12, 26)).toBeNull()
    // 2030: Christmas is a Wednesday, the first day of its week.
    expect(at(2030, 12, 24)).toBeNull()
    expect(at(2030, 12, 31, 23, 59)).toBe('christmas')
  })

  it('names each occurrence, so opting out of one year does not carry to the next', () => {
    expect(holidayWeek(new Date(2026, 10, 26))?.key).toBe('thanksgiving-2026')
    expect(holidayWeek(new Date(2027, 10, 25))?.key).toBe('thanksgiving-2027')
  })

  it('is nothing for the rest of the year', () => {
    expect(at(2026, 11, 10)).toBeNull()
    expect(at(2026, 7, 4)).toBeNull()
  })
})
