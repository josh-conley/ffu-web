import { mergeVisibleOrder } from './useManagedColumns'

describe('mergeVisibleOrder', () => {
  it('reorders visible keys while hidden keys keep their slots', () => {
    // full a,b,c,d,e with c hidden; visible (a,b,d,e) reordered to (b,a,e,d)
    expect(mergeVisibleOrder(['a', 'b', 'c', 'd', 'e'], ['b', 'a', 'e', 'd'])).toEqual(['b', 'a', 'c', 'e', 'd'])
  })

  it('is a no-op when the visible order is unchanged', () => {
    expect(mergeVisibleOrder(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
  })

  it('handles every column visible', () => {
    expect(mergeVisibleOrder(['a', 'b', 'c'], ['c', 'b', 'a'])).toEqual(['c', 'b', 'a'])
  })
})
