import type { LiveCatchUp } from '@/selectors'
import { segButton } from '@/components/controls'

// Shown only while the chosen week is past what the season in progress has played, so it's
// missing from the table: says so, and offers the one click that puts it back in.

export function UprLiveCallout({ catchUp, onWeek }: { catchUp: LiveCatchUp; onWeek: (week: number) => void }) {
  const { year, weeksPlayed } = catchUp
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border border-border border-l-4 border-l-accent bg-surface px-4 py-3 text-sm">
      <p>{year} has played {weeksPlayed} weeks, so it isn't in this table yet.</p>
      <button type="button" className={segButton(false)} onClick={() => onWeek(weeksPlayed)}>
        Rank {year} through week {weeksPlayed}
      </button>
    </div>
  )
}
