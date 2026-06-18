import type { DraftData } from '@/data'
import { useSeasonPicker } from '@/hooks/useSeasonView'
import { useDraft } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import { SeasonLeaguePicker } from '@/components/SeasonLeaguePicker'
import { DraftBoard } from '@/components/DraftBoard'
import { DraftBoardV2 } from '@/components/draft/DraftBoardV2'
import type { BoardVariant } from '@/components/draft/cells'
import { DraftList } from '@/components/DraftList'
import { segButton } from '@/components/controls'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

const VIEWS = [
  { key: 'board', label: 'Board' },
  { key: 'list', label: 'List' },
] as const

// TEMPORARY (exploration): redesign variants behind a toggle so we can compare live and pick one.
// Collapse to the chosen variant + delete the others (and the legacy DraftBoard) once decided.
const VARIANTS = [
  { key: 'spine', label: 'Spine' },
  { key: 'broadcast', label: 'Broadcast' },
  { key: 'editorial', label: 'Editorial' },
  { key: 'current', label: 'Current' },
] as const

function Board({ draft, variant }: { draft: DraftData; variant: string }) {
  if (variant === 'current') return <DraftBoard draft={draft} />
  return <DraftBoardV2 draft={draft} variant={variant as Exclude<BoardVariant, 'current'>} />
}

function Toggle({ options, value, onChange }: { options: readonly { key: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button key={o.key} type="button" onClick={() => onChange(o.key)} aria-pressed={o.key === value} className={segButton(o.key === value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function DraftContent({ loading, error, draft, view, variant, year }: { loading: boolean; error: Error | undefined; draft: DraftData | null | undefined; view: string; variant: string; year: string }) {
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (!draft) return <p className="text-muted">No draft recorded for this season.</p>
  return view === 'list' ? <DraftList draft={draft} year={year} /> : <Board draft={draft} variant={variant} />
}

export function Drafts() {
  const { years, year, tier, setYear, setTier, ready, manifestLoading, manifestError } = useSeasonPicker()
  const { data: draft, loading, error } = useDraft(tier, year, ready)
  const [view, setView] = useUrlState('view', 'board')
  const [variant, setVariant] = useUrlState('variant', 'spine')

  const isLoading = manifestLoading || (ready && loading)
  const err = manifestError ?? error

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Drafts</h1>
        {years.length > 0 && <SeasonLeaguePicker years={years} year={year} tier={tier} onYear={setYear} onTier={setTier} />}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Toggle options={VIEWS} value={view} onChange={setView} />
        {view === 'board' && <Toggle options={VARIANTS} value={variant} onChange={setVariant} />}
      </div>

      <DraftContent loading={isLoading} error={err} draft={draft} view={view} variant={variant} year={year} />
    </div>
  )
}
