import { nameForYear, type Tier } from '@/config'
import type { PrizeLeader, SeasonLongPrize } from '@/selectors'
import { LEAGUE_STYLES } from '../leagues'
import { TeamLink } from '../TeamLink'
import { RecapPanel } from './RecapPanel'

/**
 * Each league's season-long prize races: who leads Most Points, Highest Floor and Highest Score in
 * a Loss on the weeks played so far.
 *
 * Names and numbers only, never the dollar amounts: mid-season only SETTLED prize money counts
 * (ai-docs/DECISIONS.md, 2026-09-24), and a figure next to a leader reads as money already won.
 * The wording stays "leading now" for the same reason — an early leader usually doesn't hold on,
 * so nothing here may read as a result until the regular season is over.
 */

export interface LeaguePrizeRace {
  tier: Tier
  leaders: PrizeLeader[]
}

const PRIZE_LABELS: Record<SeasonLongPrize, string> = {
  mostPoints: 'Most Points',
  highestFloor: 'Highest Floor',
  highestScoreInLoss: 'Highest Score in a Loss',
}

function LeagueTable({ race, year, settled }: { race: LeaguePrizeRace; year: string; settled: boolean }) {
  const style = LEAGUE_STYLES[race.tier]
  return (
    <table className="w-full table-fixed bg-surface text-sm">
      <caption className={`px-3 py-1 text-left text-[11px] font-bold uppercase tracking-widest ${style.solidHeader}`}>
        {style.label}
      </caption>
      <colgroup>
        <col className="w-[32%]" />
        <col />
        <col className="w-20" />
      </colgroup>
      <thead className="text-[11px] uppercase tracking-wider text-muted">
        <tr>
          <th scope="col" className="px-3 pt-2 text-left font-semibold">Prize</th>
          <th scope="col" className="px-2 pt-2 text-left font-semibold">{settled ? 'Won by' : 'Leading now'}</th>
          <th scope="col" className="px-3 pt-2 text-right font-semibold">Pts</th>
        </tr>
      </thead>
      <tbody>
        {race.leaders.map((leader) => (
          <tr key={leader.prize} className="border-t border-border first:border-t-0">
            <th scope="row" className="px-3 py-2 text-left align-top text-xs font-semibold leading-tight">
              {PRIZE_LABELS[leader.prize]}
            </th>
            <td className="min-w-0 px-2 py-1.5 align-top">
              {/* Names wrap rather than truncate: a third of the capture width is tight, and a cut-off
                  name is the one thing a pasted recap can't recover from. */}
              <div className="flex flex-col gap-1">
                {leader.memberIds.map((id) => (
                  <TeamLink key={id} ffuId={id} logoSize={20} tight={leader.memberIds.length > 1}>
                    <span className="text-sm font-bold leading-tight">{nameForYear(id, year) ?? id}</span>
                  </TeamLink>
                ))}
              </div>
            </td>
            <td className="px-3 py-2 text-right align-top font-mono font-bold tabular-nums">{leader.value.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function WeekPrizeRaces({
  races,
  settled,
  year,
  week,
  compact,
  copyFilename,
}: {
  races: LeaguePrizeRace[]
  /** The regular season is over: the leaders are the winners. */
  settled: boolean
  year: string
  week: number | undefined
  compact: boolean
  copyFilename?: string
}) {
  const shown = races.filter((r) => r.leaders.length > 0)
  // Nothing played, or a season that offered none of these prizes: say nothing rather than print
  // three empty tables.
  if (shown.length === 0) return null
  return (
    <RecapPanel
      title="Prize Races"
      meta={settled ? `${year} · Regular season` : `${year} · Through Week ${week ?? ''}`}
      compact={compact}
      copyFilename={copyFilename}
    >
      <div className={compact ? 'grid gap-px bg-border sm:grid-cols-3' : 'grid gap-3 p-4 sm:grid-cols-3'}>
        {shown.map((race) => (
          <LeagueTable key={race.tier} race={race} year={year} settled={settled} />
        ))}
      </div>
    </RecapPanel>
  )
}
