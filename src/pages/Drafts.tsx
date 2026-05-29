import type { DraftData } from '@/data'
import { useSeasonPicker } from '@/hooks/useSeasonView'
import { useDraft } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import { SeasonLeaguePicker } from '@/components/SeasonLeaguePicker'
import { DraftBoard } from '@/components/DraftBoard'
import { DraftList } from '@/components/DraftList'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

const VIEWS = [
  { key: 'board', label: 'Board' },
  { key: 'list', label: 'List' },
] as const

function DraftContent({ loading, error, draft, view, year }: { loading: boolean; error: Error | undefined; draft: DraftData | null | undefined; view: string; year: string }) {
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (!draft) return <p className="text-slate-500 dark:text-slate-400">No draft recorded for this season.</p>
  return view === 'list' ? <DraftList draft={draft} year={year} /> : <DraftBoard draft={draft} />
}

export function Drafts() {
  const { years, year, tier, setYear, setTier, ready, manifestLoading, manifestError } = useSeasonPicker()
  const { data: draft, loading, error } = useDraft(tier, year, ready)
  const [view, setView] = useUrlState('view', 'board')

  const isLoading = manifestLoading || (ready && loading)
  const err = manifestError ?? error

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Drafts</h1>
        {years.length > 0 && <SeasonLeaguePicker years={years} year={year} tier={tier} onYear={setYear} onTier={setTier} />}
      </div>

      <div className="flex gap-1">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            aria-pressed={v.key === view}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              v.key === view
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <DraftContent loading={isLoading} error={err} draft={draft} view={view} year={year} />
    </div>
  )
}
