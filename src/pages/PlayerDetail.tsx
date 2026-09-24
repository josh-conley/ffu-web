import { useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePlayerData } from '@/hooks/usePlayerData'
import { playerAppearances, playerHistory, playerSummaries } from '@/selectors'
import { PlayerStats } from '@/components/players/PlayerStats'
import { PlayerManagersTable, PlayerSeasonsTable } from '@/components/players/PlayerHistoryTables'
import { PlayerHighlights } from '@/components/players/PlayerHighlights'
import { posClass } from '@/components/positions'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-text">{title}</h2>
      {children}
    </section>
  )
}

const BACK = (
  <Link to="/players" className="text-sm font-semibold text-muted hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
    ← All players
  </Link>
)

/** One NFL player's FFU history: who started him, season by season, drafts, titles, best weeks. */
export function PlayerDetail() {
  const { playerId = '' } = useParams()
  const { lineups, players, seasons, drafts, loading, error } = usePlayerData()
  const view = useMemo(() => {
    if (!lineups || !players || !seasons) return undefined
    const mine = playerAppearances(lineups, seasons).filter((a) => a.playerId === playerId)
    return { summary: playerSummaries(mine, players)[0], history: playerHistory(playerId, mine, seasons, drafts) }
  }, [lineups, players, seasons, drafts, playerId])

  if (loading) return <LoadingSpinner />
  if (error || !view) return <ErrorMessage error={error ?? 'No data'} />
  const { summary, history } = view
  if (!summary) {
    return (
      <div className="space-y-4">
        {BACK}
        <p className="border border-border bg-surface p-4 text-sm text-muted shadow-sm">
          No FFU team has rostered this player since 2021.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        {BACK}
        <h1 className="flex items-center gap-3 text-2xl font-extrabold uppercase tracking-tight">
          <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${posClass(summary.position)}`}>{summary.position}</span>
          {summary.name}
        </h1>
        <p className="text-sm text-muted">In FFU since 2021: {summary.seasons} season{summary.seasons === 1 ? '' : 's'} on a roster, {summary.rosteredWeeks} weeks in all.</p>
      </div>
      <PlayerStats summary={summary} titles={history.titles.length} />
      <PlayerHighlights titles={history.titles} drafts={history.drafts} topWeeks={history.topWeeks} />
      <Section title="Who Started Him">
        <PlayerManagersTable rows={history.managers} />
      </Section>
      <Section title="Season by Season">
        <PlayerSeasonsTable rows={history.seasons} />
      </Section>
    </div>
  )
}
