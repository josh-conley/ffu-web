import type { CareerStats, CompareSide, MemberComparison } from '@/selectors'
import { ordinal } from '../format'
import { teamAbbr } from '../seriesText'
import { TierDots } from '../Trophies'
import { CompareTable, GroupRow, HardwareRow, StatRow } from './CompareRows'

// What only a career has, every league together: seasons and playoff runs, the trophy case, where
// they finish, and the money. The figures a season shares (record, scoring, UPR, the pair against
// each other) sit beside the season's in SeasonCareerCompare instead. Same figures as the Stats
// table's "All leagues" row for each member, so the two pages can never disagree.

const usd = (n: number) => `$${n.toLocaleString('en-US')}`
const dash = '—'
const pair = <T,>(a: CompareSide, b: CompareSide, f: (s: CompareSide) => T): [T, T] => [f(a), f(b)]

function ResultRows({ a, b }: { a: CareerStats; b: CareerStats }) {
  return (
    <>
      <GroupRow label="Results" />
      <StatRow label="Seasons" a={a.seasons} b={b.seasons} values={[a.seasons, b.seasons]} better="none" />
      <StatRow
        label="Playoffs"
        title="Seasons they reached the championship bracket, each dot in that season's league"
        a={a.playoffAppearances}
        b={b.playoffAppearances}
        values={[a.playoffAppearances, b.playoffAppearances]}
        extra={[<TierDots key="a" tiers={a.playoffTiers} />, <TierDots key="b" tiers={b.playoffTiers} />]}
      />
      <StatRow label="Playoff Rec" a={`${a.playoffWins}-${a.playoffLosses}`} b={`${b.playoffWins}-${b.playoffLosses}`} values={[a.playoffWins, b.playoffWins]} />
    </>
  )
}

function HardwareRows({ a, b }: { a: CareerStats; b: CareerStats }) {
  return (
    <>
      <GroupRow label="Trophy Case" />
      <HardwareRow label="Titles" kind="title" a={a} b={b} />
      <HardwareRow label="2nd" kind="second" a={a} b={b} />
      <HardwareRow label="3rd" kind="third" a={a} b={b} />
      <HardwareRow label="Division" kind="pennant" a={a} b={b} />
      <HardwareRow label="Last" kind="last" a={a} b={b} better="low" />
    </>
  )
}

function StandingRows({ a, b }: { a: CompareSide; b: CompareSide }) {
  // A missing value must never win a "lower is better" row, so it sorts as the worst possible.
  const finish = (s: CompareSide) => s.career.averageSeasonRank ?? Infinity
  const best = (s: CompareSide) => s.career.bestFinish ?? Infinity
  return (
    <>
      <GroupRow label="Standing" />
      <StatRow label="Avg Finish" a={a.career.averageSeasonRank?.toFixed(1) ?? dash} b={b.career.averageSeasonRank?.toFixed(1) ?? dash} values={pair(a, b, finish)} better="low" />
      <StatRow label="Best Finish" a={a.career.bestFinish ? ordinal(a.career.bestFinish) : dash} b={b.career.bestFinish ? ordinal(b.career.bestFinish) : dash} values={pair(a, b, best)} better="low" />
      <GroupRow label="Money" />
      <StatRow
        label="Winnings"
        title="Prize money won, every league, 2021 on (the ESPN years had no tracked prizes)"
        a={usd(a.winnings)}
        b={usd(b.winnings)}
        values={pair(a, b, (s) => s.winnings)}
      />
    </>
  )
}

/** The career-only figures side by side, the better one in green. */
export function CareerCompare({ comparison: { a, b } }: { comparison: MemberComparison }) {
  return (
    <CompareTable aLabel={teamAbbr(a.memberId)} bLabel={teamAbbr(b.memberId)} caption="Career comparison">
      <ResultRows a={a.career} b={b.career} />
      <HardwareRows a={a.career} b={b.career} />
      <StandingRows a={a} b={b} />
    </CompareTable>
  )
}
