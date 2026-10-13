import type { MemberComparison } from '@/selectors'
import { MemberSection } from '../member/MemberSection'
import { CompareH2H } from './CompareH2H'
import { CompareHeader, CompareTrophies } from './CompareHeader'
import { CompareTiers } from './CompareTiers'
import { SeasonStrip } from './SeasonStrip'
import { TaleOfTheTape } from './TaleOfTheTape'

/**
 * Two members side by side: nameplates and the series, both trophy cases, every career figure,
 * the same split by league, both careers year by year, then their own games. One view for the
 * Members page's Compare and the matchup modal's Compare toggle, so the two always match.
 */
export function MemberCompare({ comparison: { a, b, h2h, series, years } }: { comparison: MemberComparison }) {
  return (
    <div className="space-y-8">
      <CompareHeader a={a} b={b} h2h={h2h} />
      <MemberSection title="Trophy Case">
        <CompareTrophies a={a} b={b} />
      </MemberSection>
      <MemberSection title="Tale of the Tape" note="Whole careers, every league. The better figure is in green.">
        <TaleOfTheTape a={a} b={b} />
      </MemberSection>
      <MemberSection title="By League">
        <CompareTiers a={a} b={b} />
      </MemberSection>
      <MemberSection title="Season by Season">
        <SeasonStrip a={a} b={b} years={years} series={series} />
      </MemberSection>
      <MemberSection title="Head-to-Head">
        <CompareH2H h2h={h2h} series={series} />
      </MemberSection>
    </div>
  )
}
