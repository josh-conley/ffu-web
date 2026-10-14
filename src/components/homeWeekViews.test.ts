import type { ResolvedRound } from '@/selectors'
import { homeWeekViews } from './homeWeekViews'

const round = (key: string, label: string, week: number): ResolvedRound => ({ key, label, week, matchups: [], dropped: [], dropsLowestWinner: false })

it('is the one league week on a normal day, with no Cup round that week', () => {
  expect(homeWeekViews(5, undefined, []).map((v) => [v.id, v.label])).toEqual([['current', 'Week 5']])
})

it("adds the Cup round played in the week on show", () => {
  const views = homeWeekViews(6, undefined, [round('r36', 'Round of 36', 6)])
  expect(views.map((v) => [v.id, v.label, v.kind])).toEqual([
    ['current', 'Week 6', 'league'],
    ['cup-r36', 'FFU Cup · Round of 36', 'cup'],
  ])
})

it("on Tuesday puts each week's Cup round after it, the finished one marked final", () => {
  const views = homeWeekViews(7, 6, [round('r36', 'Round of 36', 6), round('r18', 'Round of 18', 7)])
  expect(views.map((v) => [v.id, v.label, v.final])).toEqual([
    ['final', 'Week 6 · Final', true],
    ['cup-r36', 'FFU Cup · Round of 36 · Final', true],
    ['current', 'Week 7', false],
    ['cup-r18', 'FFU Cup · Round of 18', false],
  ])
})
