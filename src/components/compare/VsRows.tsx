import type { ReactNode } from 'react'
import { winPct, type CommonOpponents, type WeeklySeries, type WinLoss } from '@/selectors'
import { recordLabel } from '../format'
import { GroupRow, StatRow } from './CompareRows'

// The rows that set the pair against each other, shared by the season and career tables: their
// real meetings, the every-week series, and their records against common opponents.

export const EVERY_WEEK_TITLE =
  'Every regular-season week both teams played, in any league, scored as if they had played each other'

const played = (r: WinLoss) => r.wins + r.losses + r.ties > 0
const dash = '—'

/** A row of two records, or dashes before there is anything to compare. */
function PairRow({ label, title, has, a, b, values }: { label: string; title: string; has: boolean; a: ReactNode; b: ReactNode; values: readonly [number, number] }) {
  return <StatRow label={label} title={title} a={has ? a : dash} b={has ? b : dash} values={has ? values : undefined} />
}

export function VsRows({ h2h, common, weekly, everyWeekTitle = EVERY_WEEK_TITLE }: {
  /** Their real meetings, from a's side; undefined or empty when they haven't met. */
  h2h: WinLoss | undefined
  common: CommonOpponents
  weekly: WeeklySeries
  everyWeekTitle?: string
}) {
  const met = h2h ?? { wins: 0, losses: 0, ties: 0 }
  const weeks = weekly.record
  const level = weeks.ties > 0 ? ` (${weeks.ties} level)` : ''
  return (
    <>
      <GroupRow label="Against each other" />
      <PairRow label="Head-to-Head" title="Games they have actually played: wins each" has={played(met)} a={met.wins} b={met.losses} values={[met.wins, met.losses]} />
      <PairRow label="Every-Week Series" title={`${everyWeekTitle}: weeks won each${level}`} has={played(weeks)} a={weeks.wins} b={weeks.losses} values={[weeks.wins, weeks.losses]} />
      <PairRow
        label="Vs Common Opp."
        title={`Record against the ${common.opponents.length} teams both have played`}
        has={played(common.a) && played(common.b)}
        a={recordLabel(common.a)}
        b={recordLabel(common.b)}
        values={[winPct(common.a), winPct(common.b)]}
      />
    </>
  )
}
