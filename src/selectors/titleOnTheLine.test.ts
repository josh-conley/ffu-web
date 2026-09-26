import type { SeasonData } from '@/data'
import { linealHistory } from './lineal'
import { linealHolderGoingInto } from './titleOnTheLine'
import premier2018 from '../../public/data/2018/premier.json'

const history = [premier2018] as unknown as SeasonData[]
const holder = linealHistory(history).currentChampionId

/** A 2019 tier whose file runs through `throughWeek` — the holder's games only matter via linealHistory. */
function season2019(tier: string, throughWeek: number): SeasonData {
  const games = Array.from({ length: throughWeek }, (_, i) => ({
    week: i + 1,
    isPlayoff: false,
    participants: [
      { memberId: 'ffu-x1', score: 100 },
      { memberId: 'ffu-x2', score: 90 },
    ],
  }))
  return { ...(premier2018 as unknown as SeasonData), year: '2019', tier, games } as SeasonData
}

describe('linealHolderGoingInto', () => {
  it('names the current holder when every tier runs exactly through the week before', () => {
    const seasons = [...history, season2019('PREMIER', 2), season2019('MASTERS', 2)]
    expect(holder).not.toBeNull()
    expect(linealHolderGoingInto(seasons, '2019', 3)).toBe(holder)
  })

  it('knows the holder going into week 1 of a season with no games yet', () => {
    expect(linealHolderGoingInto([...history, season2019('PREMIER', 0)], '2019', 1)).toBe(holder)
    expect(linealHolderGoingInto(history, '2019', 1)).toBe(holder)
  })

  it('says nothing while the file lags a week behind (the belt may have moved unseen)', () => {
    expect(linealHolderGoingInto([...history, season2019('PREMIER', 1)], '2019', 3)).toBeNull()
    // One tier refreshed, another not.
    expect(linealHolderGoingInto([...history, season2019('PREMIER', 2), season2019('MASTERS', 1)], '2019', 3)).toBeNull()
    // No file for the year at all, past week 1.
    expect(linealHolderGoingInto(history, '2019', 3)).toBeNull()
  })

  it('says nothing for a week already on file, or a year that is not the latest', () => {
    expect(linealHolderGoingInto([...history, season2019('PREMIER', 3)], '2019', 3)).toBeNull()
    expect(linealHolderGoingInto([...history, season2019('PREMIER', 2)], '2018', 3)).toBeNull()
  })
})
