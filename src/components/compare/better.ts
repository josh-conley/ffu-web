// Which of a compare row's two figures is ahead, and how the leader is marked: shared by the
// three-column tables (CompareRows) and the season-and-career one (ScopeRows).

/** Which way is better: more (wins), fewer (average finish), or neither (seasons played). */
export type Better = 'high' | 'low' | 'none'

export const BETTER_TEXT = 'font-bold text-positive'

export function leaderOf([a, b]: readonly [number, number], better: Better): 'a' | 'b' | undefined {
  if (better === 'none' || a === b) return undefined
  return (better === 'high' ? a > b : a < b) ? 'a' : 'b'
}
