import type { MemberComparison } from '@/selectors'
import { MemberSection } from '../member/MemberSection'
import { CareerCompare } from './CareerCompare'
import { CommonOpponentsTable } from './CommonOpponentsTable'
import { CompareH2H } from './CompareH2H'
import { CompareHeader } from './CompareHeader'
import { CompareTiers } from './CompareTiers'
import { SeasonCareerCompare } from './SeasonCareerCompare'
import { SeasonStrip } from './SeasonStrip'

/**
 * Two members side by side: nameplates and the series, this season beside the career, what only a
 * career has (trophies included), their own games, the same split by league, both careers year by
 * year, then their common opponents. One view for the
 * Members page's Compare and the matchup modal's Compare toggle, so the two always match.
 */
export function MemberCompare({ comparison }: { comparison: MemberComparison }) {
  // No season only before any has been played, when a career has nothing to set beside it either.
  const { a, b, h2h, series, years, season, weekly, common } = comparison
  return (
    <div className="space-y-8">
      <CompareHeader a={a} b={b} h2h={h2h} />
      {season && (
        <MemberSection title={`${season.year} Season & Career`}>
          <SeasonCareerCompare comparison={comparison} season={season} />
        </MemberSection>
      )}
      <MemberSection title="Career">
        <CareerCompare comparison={comparison} />
      </MemberSection>
      <MemberSection title="Head-to-Head">
        <CompareH2H h2h={h2h} series={series} />
      </MemberSection>
      <MemberSection title="By League">
        <CompareTiers a={a} b={b} />
      </MemberSection>
      <MemberSection title="Season by Season">
        <SeasonStrip a={a} b={b} years={years} series={series} weekly={weekly} />
      </MemberSection>
      <MemberSection title="Common Opponents">
        <CommonOpponentsTable aId={a.memberId} bId={b.memberId} common={common} />
      </MemberSection>
    </div>
  )
}
