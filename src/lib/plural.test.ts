import { plural } from './plural'

describe('plural', () => {
  it('agrees with the count', () => {
    expect(plural(1, 'week')).toBe('1 week')
    expect(plural(2, 'week')).toBe('2 weeks')
    expect(plural(0, 'week')).toBe('0 weeks')
  })

  it('takes an irregular plural', () => {
    expect(plural(1, 'defense')).toBe('1 defense')
    expect(plural(3, 'loss', 'losses')).toBe('3 losses')
  })
})
