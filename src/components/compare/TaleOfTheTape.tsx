import { pointsPerGame, type CareerStats, type CompareSide } from '@/selectors'
import { formatPoints, ordinal, recordLabel } from '../format'
import { teamAbbr } from '../seriesText'
import { TierDots } from '../Trophies'
import { CompareTable, GroupRow, HardwareRow, StatRow } from './CompareRows'

// The whole-career comparison, every league together, in the groups the Stats page uses: results,
// hardware, scoring, standing and money. Same figures as the Stats table's "All leagues" row for
// each member, so the two pages can never disagree.

const pct = (n: number) => `${(n * 100).toFixed(1)}%`
const usd = (n: number) => `$${n.toLocaleString('en-US')}`
const dash = '—'
const pair = <T,>(a: CompareSide, b: CompareSide, f: (s: CompareSide) => T): [T, T] => [f(a), f(b)]

const diff = (c: CareerStats) => c.pointsFor - c.pointsAgainst
const signed = (n: number) => `${n > 0 ? '+' : ''}${formatPoints(n)}`

function ResultRows({ a, b }: { a: CareerStats; b: CareerStats }) {
  return (
    <>
      <GroupRow label="Results" />
      <StatRow label="Seasons" a={a.seasons} b={b.seasons} values={[a.seasons, b.seasons]} better="none" />
      <StatRow label="Record" a={recordLabel(a)} b={recordLabel(b)} values={[a.wins, b.wins]} />
      <StatRow label="Win %" a={pct(a.winPct)} b={pct(b.winPct)} values={[a.winPct, b.winPct]} />
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
      <GroupRow label="Hardware" />
      <HardwareRow label="Titles" kind="title" a={a} b={b} />
      <HardwareRow label="2nd" kind="second" a={a} b={b} />
      <HardwareRow label="3rd" kind="third" a={a} b={b} />
      <HardwareRow label="Division" kind="pennant" a={a} b={b} />
      <HardwareRow label="Last" kind="last" a={a} b={b} better="low" />
    </>
  )
}

/** A single game's score, or a dash before there is one. */
const game = (n: number | null) => (n === null ? dash : formatPoints(n))

function ScoringRows({ a, b }: { a: CareerStats; b: CareerStats }) {
  const [ppgA, ppgB] = [pointsPerGame(a), pointsPerGame(b)]
  return (
    <>
      <GroupRow label="Scoring" />
      <StatRow label="PPG" title="Points per game" a={ppgA?.toFixed(2) ?? dash} b={ppgB?.toFixed(2) ?? dash} values={[ppgA ?? 0, ppgB ?? 0]} />
      <StatRow label="Points For" a={formatPoints(a.pointsFor)} b={formatPoints(b.pointsFor)} values={[a.pointsFor, b.pointsFor]} />
      <StatRow label="Point Diff" a={signed(diff(a))} b={signed(diff(b))} values={[diff(a), diff(b)]} />
      <StatRow label="High Game" a={game(a.careerHighGame)} b={game(b.careerHighGame)} values={[a.careerHighGame ?? 0, b.careerHighGame ?? 0]} />
      <StatRow label="Low Game" a={game(a.careerLowGame)} b={game(b.careerLowGame)} />
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
      <StatRow label="Avg UPR" title="Union Power Rating, averaged over their seasons" a={a.upr?.toFixed(2) ?? dash} b={b.upr?.toFixed(2) ?? dash} values={pair(a, b, (s) => s.upr ?? 0)} />
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

/** Every career figure side by side, the better one in green. */
export function TaleOfTheTape({ a, b }: { a: CompareSide; b: CompareSide }) {
  return (
    <CompareTable aLabel={teamAbbr(a.memberId)} bLabel={teamAbbr(b.memberId)} caption="Career comparison">
      <ResultRows a={a.career} b={b.career} />
      <HardwareRows a={a.career} b={b.career} />
      <ScoringRows a={a.career} b={b.career} />
      <StandingRows a={a} b={b} />
    </CompareTable>
  )
}
