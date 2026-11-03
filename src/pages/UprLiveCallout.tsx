import type { LiveCatchUp } from '@/selectors'
import { segButton } from '@/components/controls'

// Shown only while the chosen week is past what the season in progress has played, so it's
// missing from the table: the one click that puts it back in.

export function UprLiveCallout({ catchUp, onWeek }: { catchUp: LiveCatchUp; onWeek: (week: number) => void }) {
  const { year, weeksPlayed } = catchUp
  return (
    <button type="button" className={segButton(false)} onClick={() => onWeek(weeksPlayed)}>
      Show {year} (through week {weeksPlayed})
    </button>
  )
}
