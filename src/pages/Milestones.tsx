import { useMemo } from 'react'
import { useAllSeasons } from '@/hooks/useLeagueData'
import {
  MILESTONES,
  MILESTONE_CATEGORIES,
  WATCH_THRESHOLD,
  milestoneNewsWeek,
  milestonesReachedInWeek,
  milestoneStandings,
  milestoneWatch,
  type MilestoneCategory,
  type MilestoneReached,
} from '@/selectors'
import { MILESTONE_META as META } from '@/components/milestones'
import { MilestoneTable, RecentlyReached } from '@/components/MilestoneTable'
import { MilestoneReachedRow } from '@/components/MilestoneReachedRow'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

function CategorySection({
  category,
  rows,
  all,
}: {
  category: MilestoneCategory
  rows: ReturnType<typeof milestoneStandings>
  all: ReturnType<typeof milestoneStandings>
}) {
  const { label, blurb, icon } = META[category]
  const tiers = MILESTONES[category].map((m) => m.toLocaleString('en-US')).join(' · ')
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-text">
          <span className="text-accent">{icon}</span>
          {label}
        </h2>
        <span className="font-mono text-[11px] tabular-nums text-muted">{tiers}</span>
      </div>
      <p className="text-sm text-muted">{blurb}</p>
      {rows.length > 0 ? (
        <MilestoneTable category={category} rows={rows} />
      ) : (
        <p className="border border-dashed border-border bg-surface/60 p-4 text-sm text-muted">
          Nobody is within reach of their next {label.toLowerCase()} milestone yet.
        </p>
      )}
      <RecentlyReached category={category} rows={all.filter((s) => s.category === category)} />
    </section>
  )
}

/** The latest week's fallen milestones — up top, because a member who has just passed one has
 *  left the watch tables below and this is the only place they would still show. */
function JustReached({ year, week, reached }: { year: string; week: number; reached: MilestoneReached[] }) {
  if (reached.length === 0) return null
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-text">
        Reached in Week {week}
        <span className="ml-2 font-normal text-muted">{year}</span>
      </h2>
      <div className="grid gap-px border border-border bg-border shadow-sm sm:grid-cols-2">
        {reached.map((r) => (
          <MilestoneReachedRow key={`${r.memberId}-${r.category}-${r.milestone}`} reached={r} />
        ))}
      </div>
    </section>
  )
}

/**
 * Milestone Watch — who is closing in on a career milestone.
 *
 * A member appears once they are at least WATCH_THRESHOLD of the way from the milestone they last
 * passed to the next one. Everything here is derived from the same career totals the Stats page
 * shows, so the two can never disagree; nothing about milestones is stored.
 */
export function Milestones() {
  const { data: seasons, loading, error } = useAllSeasons()
  const standings = useMemo(() => (seasons ? milestoneStandings(seasons) : []), [seasons])
  const watch = useMemo(() => milestoneWatch(standings), [standings])
  const news = useMemo(() => (seasons ? milestoneNewsWeek(seasons) : undefined), [seasons])
  const reached = useMemo(
    () => (seasons && news ? milestonesReachedInWeek(seasons, news.year, news.week) : []),
    [seasons, news],
  )

  if (loading) return <LoadingSpinner />
  if (error || !seasons) return <ErrorMessage error={error ?? 'No data'} />

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Milestone Watch</h1>
        <p className="max-w-2xl text-sm text-muted">
          Careers closing in on a round number. A team joins the watch once it is{' '}
          {Math.round(WATCH_THRESHOLD * 100)}% of the way from the milestone it last passed to the next one — so the
          list is teams with something to play for now, not everyone above a line.
        </p>
      </div>
      {news && <JustReached year={news.year} week={news.week} reached={reached} />}
      {MILESTONE_CATEGORIES.map((category) => (
        <CategorySection key={category} category={category} rows={watch.get(category) ?? []} all={standings} />
      ))}
    </div>
  )
}
