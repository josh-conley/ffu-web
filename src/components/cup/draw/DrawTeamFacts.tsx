import type { DrawFacts } from '@/selectors'
import { ordinal, recordLabel } from '../../format'
import { LEAGUE_STYLES } from '../../leagues'

// The "on the clock" talking points under a team's name: this season so far, last season's
// finish, and titles. Short on purpose — it is read aloud over a call, not studied.

function lines(facts: DrawFacts): string[] {
  const out: string[] = []
  const now = facts.thisSeason
  if (now) out.push(`This season ${recordLabel(now.record)} · ${ordinal(now.rank)} of ${now.size}`)
  const last = facts.lastSeason
  if (last) {
    const league = LEAGUE_STYLES[last.tier].label
    const finish = last.place !== undefined ? `${ordinal(last.place)} in ${league}` : league
    out.push(`${last.year}: ${finish}${last.move ? ` · ${last.move}` : ''}`)
  }
  if (facts.titles > 0) out.push(`${facts.titles}× champion`)
  else out.push(facts.seasons <= 1 ? 'First FFU season' : `${ordinal(facts.seasons)} season, no title yet`)
  return out
}

export function DrawTeamFacts({ facts }: { facts: DrawFacts }) {
  return (
    <ul className="mt-1 space-y-0.5 text-sm text-muted">
      {lines(facts).map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  )
}
