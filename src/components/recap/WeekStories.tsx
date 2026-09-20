import { nameForYear } from '@/config'
import type { WeekMatchup, WeekNotes } from '@/selectors'
import { LEAGUE_STYLES } from '../leagues'
import { TeamLogo } from '../TeamLogo'
import { RecapPanel } from './RecapPanel'

/**
 * The week's four matchup stories: the rout, the finish that came down to nothing, and the two
 * teams the schedule treated worst and best.
 *
 * The last pair is the FFU's favourite argument — a team can score the second-most points in its
 * league and still lose — so the block names the score that lost and the score that got away with
 * it, rather than leaving it to be worked out from a results grid.
 */

interface Story {
  key: keyof Omit<WeekNotes, 'ties'>
  label: string
  /** What the reader should take from it, on the web version only. */
  blurb: string
}

const STORIES: Story[] = [
  { key: 'blowout', label: 'Biggest Blowout', blurb: 'Widest margin of the week' },
  { key: 'nailbiter', label: 'Closest Call', blurb: 'Narrowest margin of the week' },
  { key: 'unluckiestLoss', label: 'Hard-Luck Loss', blurb: 'Highest score that still lost' },
  { key: 'luckiestWin', label: 'Luckiest Win', blurb: 'Lowest score that still won' },
]

const name = (memberId: string, year: string) => nameForYear(memberId, year) ?? memberId

/**
 * One side of the game. Winner and loser get a line each rather than sharing one: two team names
 * and two scores on a single line forces the names to truncate at any width the newsletter can
 * use, and a recap that can't name the teams isn't reporting anything.
 */
function Side({
  memberId,
  score,
  year,
  won,
}: {
  memberId: string
  score: number
  year: string
  won: boolean
}) {
  return (
    <div className={`flex min-w-0 items-center gap-2 text-sm ${won ? 'font-bold' : 'text-muted'}`}>
      <TeamLogo ffuId={memberId} size={22} />
      <span className="truncate">{name(memberId, year)}</span>
      <span className={`ml-auto shrink-0 font-mono tabular-nums ${won ? 'font-bold' : ''}`}>{score.toFixed(2)}</span>
    </div>
  )
}

function StoryCard({ story, game, year, compact }: { story: Story; game: WeekMatchup; year: string; compact: boolean }) {
  const style = LEAGUE_STYLES[game.tier]
  return (
    <div className={`min-w-0 bg-surface ${compact ? 'px-3 py-2' : `border-l-4 ${style.border} p-3`}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted">{story.label}</span>
        <span className={`shrink-0 text-[11px] font-bold uppercase tracking-wider ${style.text}`}>{style.label}</span>
      </div>
      <div className="mt-0.5 space-y-0.5">
        <Side memberId={game.winnerId} score={game.winnerScore} year={year} won />
        <Side memberId={game.loserId} score={game.loserScore} year={year} won={false} />
      </div>
      <div className="mt-1 font-mono text-xs font-bold tabular-nums text-muted">
        {game.margin === 0 ? 'level' : `by ${game.margin.toFixed(2)}`}
        {!compact && <span className="ml-2 font-sans font-normal normal-case">· {story.blurb}</span>}
      </div>
    </div>
  )
}

export function WeekStories({
  notes,
  year,
  week,
  compact,
  copyFilename,
}: {
  notes: WeekNotes
  year: string
  week: number | undefined
  compact: boolean
  copyFilename?: string
}) {
  const told = STORIES.map((story) => ({ story, game: notes[story.key] })).filter(
    (row): row is { story: Story; game: WeekMatchup } => row.game !== undefined,
  )
  return (
    <RecapPanel
      title="Week in Review"
      meta={week ? `${year} · Week ${week}` : year}
      compact={compact}
      copyFilename={copyFilename}
    >
      {told.length === 0 ? (
        <p className="p-4 text-sm text-muted">No completed week to report yet.</p>
      ) : (
        <div className={compact ? 'grid gap-px bg-border sm:grid-cols-2' : 'grid gap-2 p-4 sm:grid-cols-2'}>
          {told.map(({ story, game }) => (
            <StoryCard key={story.key} story={story} game={game} year={year} compact={compact} />
          ))}
        </div>
      )}
    </RecapPanel>
  )
}
