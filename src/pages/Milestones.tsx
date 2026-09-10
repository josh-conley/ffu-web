import { useMemo } from 'react'
import { FaArrowTrendUp, FaCoins, FaFireFlameCurved, FaShieldHalved } from 'react-icons/fa6'
import { useAllSeasons } from '@/hooks/useLeagueData'
import {
  MILESTONES,
  MILESTONE_CATEGORIES,
  WATCH_THRESHOLD,
  milestoneStandings,
  milestoneWatch,
  type MilestoneCategory,
} from '@/selectors'
import { MilestoneTable, RecentlyReached } from '@/components/MilestoneTable'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

interface CategoryMeta {
  label: string
  blurb: string
  icon: React.ReactNode
}

const META: Record<MilestoneCategory, CategoryMeta> = {
  pointsFor: { label: 'Points Scored', blurb: 'Career points for, across every league.', icon: <FaArrowTrendUp aria-hidden /> },
  wins: { label: 'Career Wins', blurb: 'Regular season and playoffs, all leagues.', icon: <FaFireFlameCurved aria-hidden /> },
  earnings: { label: 'Career Earnings', blurb: 'Every prize won, including cross-league prizing.', icon: <FaCoins aria-hidden /> },
  pointsAgainst: { label: 'Points Against', blurb: 'The other kind of milestone.', icon: <FaShieldHalved aria-hidden /> },
}

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
      {MILESTONE_CATEGORIES.map((category) => (
        <CategorySection key={category} category={category} rows={watch.get(category) ?? []} all={standings} />
      ))}
    </div>
  )
}
