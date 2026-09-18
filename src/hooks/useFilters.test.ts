import { applyFilters, inSpan, parseSpan, spanValue, type FilterDef } from './useFilters'

interface Row {
  pos: string
  team: string
}

const rows: Row[] = [
  { pos: 'QB', team: 'a' },
  { pos: 'RB', team: 'a' },
  { pos: 'RB', team: 'b' },
  { pos: 'WR', team: 'b' },
]

const defs: FilterDef<Row>[] = [
  { key: 'pos', label: 'Position', options: [], predicate: (r, v) => r.pos === v },
  { key: 'team', label: 'Team', options: [], predicate: (r, v) => r.team === v },
]

describe('applyFilters', () => {
  it('returns all rows when nothing is active', () => {
    expect(applyFilters(defs, {}, rows)).toHaveLength(4)
  })

  it('applies a single active filter', () => {
    expect(applyFilters(defs, { pos: 'RB' }, rows)).toEqual([
      { pos: 'RB', team: 'a' },
      { pos: 'RB', team: 'b' },
    ])
  })

  it('AND-s multiple active filters', () => {
    expect(applyFilters(defs, { pos: 'RB', team: 'b' }, rows)).toEqual([{ pos: 'RB', team: 'b' }])
  })

  it('ignores empty values (treated as "All")', () => {
    expect(applyFilters(defs, { pos: '', team: 'a' }, rows)).toEqual([
      { pos: 'QB', team: 'a' },
      { pos: 'RB', team: 'a' },
    ])
  })
})

describe('parseSpan', () => {
  it('reads a well-formed span', () => {
    expect(parseSpan('3-7')).toEqual([3, 7])
    expect(parseSpan('5-5')).toEqual([5, 5])
  })

  it('rejects anything malformed rather than guessing', () => {
    // A reversed or unparseable span means the URL was hand-edited; callers treat undefined as
    // "no filter", which is safer than silently showing an empty table.
    expect(parseSpan('7-3')).toBeUndefined()
    expect(parseSpan('')).toBeUndefined()
    expect(parseSpan('3')).toBeUndefined()
    expect(parseSpan('a-b')).toBeUndefined()
  })
})

describe('inSpan', () => {
  it('is inclusive at both ends', () => {
    expect(inSpan(3, '3-7')).toBe(true)
    expect(inSpan(7, '3-7')).toBe(true)
    expect(inSpan(2, '3-7')).toBe(false)
    expect(inSpan(8, '3-7')).toBe(false)
  })

  it('keeps the row when the span cannot be read', () => {
    expect(inSpan(99, 'nonsense')).toBe(true)
  })
})

describe('spanValue', () => {
  it('is empty — inactive — when the span covers everything', () => {
    expect(spanValue(1, 15, 1, 15)).toBe('')
  })

  it('encodes a narrowed span', () => {
    expect(spanValue(3, 7, 1, 15)).toBe('3-7')
    expect(spanValue(1, 7, 1, 15)).toBe('1-7')
    expect(spanValue(3, 15, 1, 15)).toBe('3-15')
  })
})

describe('applyFilters with a span filter', () => {
  interface Pick {
    round: number
  }
  const picks: Pick[] = [{ round: 1 }, { round: 4 }, { round: 9 }]
  const spanDefs: FilterDef<Pick>[] = [
    { key: 'round', label: 'Rounds', type: 'span', min: 1, max: 15, predicate: (p, v) => inSpan(p.round, v) },
  ]

  it('keeps only rows inside the span', () => {
    expect(applyFilters(spanDefs, { round: '2-9' }, picks)).toEqual([{ round: 4 }, { round: 9 }])
  })

  it('is inactive when the value is empty', () => {
    expect(applyFilters(spanDefs, { round: '' }, picks)).toHaveLength(3)
  })
})
