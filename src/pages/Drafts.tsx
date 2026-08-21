import { LIVE_LEAGUE_IDS } from '@/config'
import type { DraftData, LiveDraftOrder } from '@/data'
import { useSeasonPicker } from '@/hooks/useSeasonView'
import { useDraft } from '@/hooks/useLeagueData'
import { isLiveDraftYear, useDraftOrder } from '@/hooks/useDraftOrder'
import { useUrlState } from '@/hooks/useUrlState'
import { SeasonLeaguePicker } from '@/components/SeasonLeaguePicker'
import { DraftBoard } from '@/components/draft/DraftBoard'
import { DraftOrderBoard } from '@/components/draft/DraftOrderBoard'
import { DraftList } from '@/components/DraftList'
import { segButton } from '@/components/controls'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

// Two kinds of season live on this page: COMPLETED ones, whose full pick-by-pick draft comes from
// the provider, and the LIVE one, which exists only on Sleeper and has an order but no picks yet.
// The picker offers both (the live year is passed in explicitly — see useSeasonPicker), and the
// content branches on which it is.

const VIEWS = [
  { key: 'board', label: 'Board' },
  { key: 'list', label: 'List' },
] as const

/** Years configured as live on Sleeper — module scope, so it's a stable reference across renders. */
const LIVE_YEARS = Object.keys(LIVE_LEAGUE_IDS)

function DraftContent({ loading, error, draft, view, year }: { loading: boolean; error: Error | undefined; draft: DraftData | null | undefined; view: string; year: string }) {
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (!draft) return <p className="text-muted">No draft recorded for this season.</p>
  return view === 'list' ? <DraftList draft={draft} year={year} /> : <DraftBoard draft={draft} />
}

function LiveDraftContent({ loading, error, order, year }: { loading: boolean; error: Error | undefined; order: LiveDraftOrder | undefined; year: string }) {
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (!order) return <p className="text-muted">No draft is configured for this season yet.</p>
  return <DraftOrderBoard order={order} year={year} />
}

export function Drafts() {
  const { years, year, tier, setYear, setTier, ready, manifestLoading, manifestError } = useSeasonPicker(LIVE_YEARS)
  const live = isLiveDraftYear(year)
  const { data: draft, loading, error } = useDraft(tier, year, ready && !live)
  const { order, loading: orderLoading, error: orderError } = useDraftOrder(tier, year, ready && live)
  const [view, setView] = useUrlState('view', 'board')

  const isLoading = manifestLoading || (ready && (live ? orderLoading : loading))
  const err = manifestError ?? (live ? orderError : error)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Drafts</h1>
        {years.length > 0 && <SeasonLeaguePicker years={years} year={year} tier={tier} onYear={setYear} onTier={setTier} />}
      </div>

      {/* Board/List is a view of PICKS; the live season has none yet, so the toggle would be inert. */}
      {!live && (
        <div className="flex gap-1">
          {VIEWS.map((v) => (
            <button key={v.key} type="button" onClick={() => setView(v.key)} aria-pressed={v.key === view} className={segButton(v.key === view)}>
              {v.label}
            </button>
          ))}
        </div>
      )}

      {live ? (
        <LiveDraftContent loading={isLoading} error={err} order={order} year={year} />
      ) : (
        <DraftContent loading={isLoading} error={err} draft={draft} view={view} year={year} />
      )}
    </div>
  )
}
