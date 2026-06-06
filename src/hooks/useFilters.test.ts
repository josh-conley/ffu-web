import { applyFilters, type FilterDef } from './useFilters'

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
