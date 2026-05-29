import {
  getMember,
  nameForYear,
  memberBySleeperId,
  getSeasonMeta,
  tiersForYear,
  playoffWeeks,
  regularSeasonWeeks,
  seasonLength,
  getOwner,
  formatOwner,
  ownerNames,
  MEMBERS,
  SEASONS,
  OWNERS,
} from './index'

describe('member registry', () => {
  it('has one entry per ffuId (no duplicates)', () => {
    const ids = MEMBERS.map((m) => m.ffuId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('resolves a member by ffuId', () => {
    expect(getMember('ffu-009')?.name).toBe('Fort Wayne Banana Bread')
    expect(getMember('nope')).toBeUndefined()
  })

  it('uses the historical name for a season, else the current name', () => {
    expect(nameForYear('ffu-009', '2020')).toBe('Wisconsian Banana Bread')
    expect(nameForYear('ffu-009', '2024')).toBe('Fort Wayne Banana Bread')
  })

  it('merges Team Dogecoin onto ffu-031 across both Sleeper accounts', () => {
    expect(MEMBERS.find((m) => m.ffuId === 'ffu-032')).toBeUndefined()
    const doge = getMember('ffu-031')
    expect(doge?.platformIds.sleeper).toEqual(['726572095210930176', '731211092713402368'])
    // Both legacy accounts resolve to the one franchise.
    expect(memberBySleeperId('726572095210930176')?.ffuId).toBe('ffu-031')
    expect(memberBySleeperId('731211092713402368')?.ffuId).toBe('ffu-031')
  })
})

describe('season registry', () => {
  it('exposes era + divisions metadata', () => {
    expect(getSeasonMeta('PREMIER', '2019')?.era).toBe('espn')
    expect(getSeasonMeta('PREMIER', '2024')?.era).toBe('sleeper')
    expect(getSeasonMeta('PREMIER', '2025')?.hasDivisions).toBe(true)
    expect(getSeasonMeta('PREMIER', '2024')?.hasDivisions).toBe(false)
  })

  it('lists tiers per year in hierarchy order', () => {
    expect(tiersForYear('2019')).toEqual(['PREMIER', 'NATIONAL']) // ESPN: no Masters
    expect(tiersForYear('2021')).toEqual(['PREMIER', 'NATIONAL']) // Masters not yet
    expect(tiersForYear('2024')).toEqual(['PREMIER', 'MASTERS', 'NATIONAL'])
  })

  it('covers all 20 legacy tier-seasons', () => {
    expect(SEASONS).toHaveLength(20)
  })
})

describe('owners', () => {
  it('has unique owner ids', () => {
    const ids = OWNERS.map((o) => o.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every ownerId referenced by a member resolves to an Owner', () => {
    for (const m of MEMBERS) {
      for (const o of m.owners) {
        expect(getOwner(o.ownerId), `${m.ffuId} → ${o.ownerId}`).toBeDefined()
      }
    }
  })

  it('formats and resolves the Minutemen owner (Josh C.)', () => {
    expect(formatOwner({ id: 'x', firstName: 'Josh', lastInitial: 'C' })).toBe('Josh C.')
    expect(ownerNames('ffu-023')).toEqual(['Josh C.'])
    expect(ownerNames('ffu-002')).toEqual([]) // not yet collected
  })
})

describe('era metadata', () => {
  it('derives season length + playoff/regular weeks per era', () => {
    expect(seasonLength('espn')).toBe(16)
    expect(seasonLength('sleeper')).toBe(17)
    expect(playoffWeeks('espn')).toEqual([14, 15, 16])
    expect(playoffWeeks('sleeper')).toEqual([15, 16, 17])
    expect(regularSeasonWeeks('espn')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
    expect(regularSeasonWeeks('sleeper')).toHaveLength(14)
  })
})
