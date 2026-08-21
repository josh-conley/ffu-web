import type { ReactNode } from 'react'
import { FaFire } from 'react-icons/fa6'
import { CUP_ACCENT } from '@/config'
import type { TieStory } from '@/selectors'
import { LEAGUE_STYLES } from '../../leagues'

// The line the commissioner reads out after a tie lands. Everything here comes from eight seasons
// of real games, which is the whole point — no generic draw animation can tell you these two met in
// a playoff last November.

function Flag({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest"
      style={{ borderColor: CUP_ACCENT, color: CUP_ACCENT }}
    >
      {icon}
      {children}
    </span>
  )
}

/** "Stallions lead 3–2" / "All square at 2–2" / "Rhinos lead 1–0". */
function seriesLine(story: TieStory, aName: string, bName: string): string {
  const { aWins, bWins, ties } = story
  const suffix = ties > 0 ? ` (${ties} tied)` : ''
  if (aWins === bWins) return `All square at ${aWins}–${bWins}${suffix}`
  const [leader, high, low] = aWins > bWins ? [aName, aWins, bWins] : [bName, bWins, aWins]
  return `${leader} lead ${high}–${low}${suffix}`
}

export function TieStoryLine({ story, aName, bName }: { story: TieStory; aName: string; bName: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-sm">
      {story.meetings === 0 ? (
        <span className="font-extrabold uppercase tracking-widest" style={{ color: CUP_ACCENT }}>
          First ever meeting
        </span>
      ) : (
        <>
          <span className="font-bold uppercase tracking-wide">
            Met {story.meetings}
            {story.meetings === 1 ? ' time' : ' times'}
          </span>
          <span className="text-muted">{seriesLine(story, aName, bName)}</span>
          {story.last && (
            <span className="text-muted">
              Last: {story.last.year} wk {story.last.week}
              <span className={`ml-1.5 ${LEAGUE_STYLES[story.last.tier].text}`}>
                {LEAGUE_STYLES[story.last.tier].label}
              </span>
            </span>
          )}
        </>
      )}

      {story.playoffRematch && (
        <span className="ml-auto">
          <Flag icon={<FaFire aria-hidden />}>Playoff rematch</Flag>
        </span>
      )}
    </div>
  )
}
