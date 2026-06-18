import { describe, expect, it } from 'vitest'
import type { DraftData, DraftPick, DraftPlayer } from '@/data'
import { cellStateClass, presentPositions, shortName } from './format'

const player = (p: Partial<DraftPlayer>): DraftPlayer => ({ id: 'x', name: 'X', position: 'WR', ...p })

describe('shortName', () => {
  it('abbreviates a skill player to "F. Last"', () => {
    expect(shortName(player({ name: 'Christian McCaffrey', position: 'RB' }))).toBe('C. McCaffrey')
  })

  it('keeps multi-word surnames intact', () => {
    expect(shortName(player({ name: 'Amon-Ra St. Brown', position: 'WR' }))).toBe('A. St. Brown')
  })

  it('leaves a single-token name untouched', () => {
    expect(shortName(player({ name: 'Cher', position: 'WR' }))).toBe('Cher')
  })

  it('uses the NFL team for a defense (no personal name)', () => {
    expect(shortName(player({ name: 'Bills D/ST', position: 'DEF', nflTeam: 'BUF' }))).toBe('BUF')
  })

  it('falls back to the name when a defense has no team', () => {
    expect(shortName(player({ name: 'Bills D/ST', position: 'DEF' }))).toBe('Bills D/ST')
  })
})

describe('presentPositions', () => {
  const draft = (positions: string[]): DraftData =>
    ({ picks: positions.map((position) => ({ player: { position } } as DraftPick)) } as DraftData)

  it('returns positions in canonical QB→DEF order regardless of input order', () => {
    expect(presentPositions(draft(['DEF', 'WR', 'QB', 'RB']))).toEqual(['QB', 'RB', 'WR', 'DEF'])
  })

  it('dedupes and sorts unknown positions after the canonical ones, alphabetically', () => {
    expect(presentPositions(draft(['WR', 'WR', 'LB', 'CB', 'QB']))).toEqual(['QB', 'WR', 'CB', 'LB'])
  })
})

describe('cellStateClass', () => {
  it('lifts the highlighted drafter and dims the rest', () => {
    expect(cellStateClass('ffu-001', 'ffu-001')).toContain('ring-accent')
    expect(cellStateClass('ffu-001', 'ffu-002')).toBe('opacity-30')
  })

  it('shows a hover affordance when nothing is highlighted', () => {
    expect(cellStateClass(null, 'ffu-001')).toContain('hover:ring')
  })
})
