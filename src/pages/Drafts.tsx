import type { DraftData, SeasonLineups } from '@/data'
import { useSeasonPicker } from '@/hooks/useSeasonView'
import { useDraft, useLineups } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import { SeasonLeaguePicker } from '@/components/SeasonLeaguePicker'
import { DraftBoard } from '@/components/DraftBoard'
import { DraftList } from '@/components/DraftList'
import { DraftValue } from '@/components/DraftValue'
import { segButton } from '@/components/controls'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

const VIEWS = [
  { key: 'board', label: 'Board' },
  { key: 'list', label: 'List' },
  { key: 'value', label: 'Value' },
] as const

function DraftContent({ loading, error, draft, lineups, view, year }: { loading: boolean; error: Error | undefined; draft: DraftData | null | undefined; lineups: SeasonLineups | null | undefined; view: string; year: string }) {
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (!draft) return <p className="text-muted">No draft recorded for this season.</p>
  if (view === 'value') return <DraftValue draft={draft} lineups={lineups ?? null} year={year} />
  return view === 'list' ? <DraftList draft={draft} year={year} /> : <DraftBoard draft={draft} />
}

export function Drafts() {
  const { years, year, tier, setYear, setTier, ready, manifestLoading, manifestError } = useSeasonPicker()
  const { data: draft, loading, error } = useDraft(tier, year, ready)
  const [view, setView] = useUrlState('view', 'board')
  // Lineups feed the Value view only — lazy-loaded when it's first selected.
  const lineups = useLineups(tier, year, ready && view === 'value')

  const isLoading = manifestLoading || (ready && (loading || (view === 'value' && lineups.loading)))
  const err = manifestError ?? error ?? (view === 'value' ? lineups.error : undefined)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Drafts</h1>
        {years.length > 0 && <SeasonLeaguePicker years={years} year={year} tier={tier} onYear={setYear} onTier={setTier} />}
      </div>

      <div className="flex gap-1">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            aria-pressed={v.key === view}
            className={segButton(v.key === view)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <DraftContent loading={isLoading} error={err} draft={draft} lineups={lineups.data} view={view} year={year} />
    </div>
  )
}
