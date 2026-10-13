import { winPct, type CommonOpponents, type WeeklySeries, type WinLoss } from '@/selectors'
import { recordLabel } from '../format'
import { ScopeGroupRow, ScopeRow, type ScopePair } from './ScopeRows'

// The rows that set the pair against each other, this season and all time: their real meetings,
// the every-week series, and their records against common opponents.

const EVERY_WEEK_TITLE =
  'Every regular-season week both teams played, in any league, scored as if they had played each other'

/** The pair's figures against each other within one scope (the season, or all time). */
export interface VsScope {
  /** Their real meetings, from a's side; undefined or empty when they haven't met. */
  h2h: WinLoss | undefined
  common: CommonOpponents
  weekly: WeeklySeries
}

const played = (r: WinLoss) => r.wins + r.losses + r.ties > 0
const dash = '—'
const none: ScopePair = { a: dash, b: dash }

/** Wins each, from a's side of the record, or dashes before there is anything to count. */
function winsEach(r: WinLoss | undefined): ScopePair {
  return r && played(r) ? { a: r.wins, b: r.losses, values: [r.wins, r.losses] } : none
}

function commonPair({ a, b }: CommonOpponents): ScopePair {
  return played(a) && played(b) ? { a: recordLabel(a), b: recordLabel(b), values: [winPct(a), winPct(b)] } : none
}

/** Weeks neither won, which "weeks won each" leaves out, said only when there are any. */
function levelNote(season: VsScope, career: VsScope): string {
  const [s, c] = [season.weekly.record.ties, career.weekly.record.ties]
  return c > 0 ? ` (level: ${s} this season, ${c} all time)` : ''
}

export function VsRows({ season, career }: { season: VsScope; career: VsScope }) {
  const opponents = `${season.common.opponents.length} this season, ${career.common.opponents.length} all time`
  return (
    <>
      <ScopeGroupRow label="Against each other" />
      <ScopeRow label="Head-to-Head" title="Games they have actually played: wins each" season={winsEach(season.h2h)} career={winsEach(career.h2h)} />
      <ScopeRow
        label="Every-Week Series"
        title={`${EVERY_WEEK_TITLE}: weeks won each${levelNote(season, career)}`}
        season={winsEach(season.weekly.record)}
        career={winsEach(career.weekly.record)}
      />
      <ScopeRow
        label="Vs Common Opp."
        title={`Record against the teams both have played (${opponents})`}
        season={commonPair(season.common)}
        career={commonPair(career.common)}
      />
    </>
  )
}
