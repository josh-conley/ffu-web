import type { RoundOutline } from '@/selectors'
import { CupDraw } from './CupDraw'
import { CupRounds } from './CupRounds'
import { CupSchedule } from './CupSchedule'
import { CupSpoils } from './CupSpoils'
import { CupSection } from './parts'

/** Everything the amendment settles: when it's played, how you survive, how it's drawn, what it pays. */
export function CupFormatPanel({ rounds, year }: { rounds: RoundOutline[]; year: string }) {
  return (
    <div className="space-y-8">
      <CupSection
        title="Schedule of events"
        lede="Cup timing moves each season with NFL bye weeks and the FFU calendar. The tournament weeks are announced alongside the finalization of Draft Day."
      >
        <CupSchedule rounds={rounds} />
      </CupSection>

      <CupSection title="Round by round">
        <CupRounds rounds={rounds} />
      </CupSection>

      <CupSection
        title="The draw"
        lede="The first round is drawn, not seeded — Premier draws its opposition out of the other two leagues, and seeding follows from the order teams come out."
      >
        <CupDraw />
      </CupSection>

      <CupSection title="Prizing">
        <CupSpoils rounds={rounds} year={year} />
      </CupSection>
    </div>
  )
}
