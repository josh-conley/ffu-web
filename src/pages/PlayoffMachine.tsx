import { useMemo, useState } from 'react'
import { LIVE_LEAGUE_IDS, tiersForYear, type Tier } from '@/config'
import type { SeasonData } from '@/data'
import { useSeason } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import { machineWeeks, projectedClinches, projectedSeeding, togglePick, type MachinePicks } from '@/selectors'
import { segButton } from '@/components/controls'
import { SeasonLeaguePicker } from '@/components/SeasonLeaguePicker'
import { MachineStandings, type StandingsView } from '@/components/playoffs/MachineStandings'
import { MachineGames } from '@/components/playoffs/MachineGames'
import { PlayoffFieldStrip } from '@/components/playoffs/PlayoffFieldStrip'
import { SeedingRules } from '@/components/playoffs/SeedingRules'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

// The season being played: the machine has nothing to say about a finished one.
const YEAR = Object.keys(LIVE_LEAGUE_IDS).sort().at(-1) ?? ''

type Panel = 'games' | 'seeds'

/** Phones only: one panel at a time, since side by side doesn't fit and stacked is a long scroll. */
function PanelSwitch({ panel, onPanel, picked }: { panel: Panel; onPanel: (p: Panel) => void; picked: number }) {
  return (
    <div className="grid grid-cols-2 gap-1 lg:hidden" role="group" aria-label="Show">
      <button type="button" aria-pressed={panel === 'games'} onClick={() => onPanel('games')} className={`${segButton(panel === 'games')} justify-center`}>
        Pick games{picked > 0 ? ` (${picked})` : ''}
      </button>
      <button type="button" aria-pressed={panel === 'seeds'} onClick={() => onPanel('seeds')} className={`${segButton(panel === 'seeds')} justify-center`}>
        Seeds
      </button>
    </div>
  )
}

function MachineContent({ season, picks, onPick, onClear }: {
  season: SeasonData
  picks: MachinePicks
  onPick: (key: string, winnerId: string) => void
  /** Clears this league's picks only (the page keeps every league's). */
  onClear: (keys: readonly string[]) => void
}) {
  const weeks = useMemo(() => machineWeeks(season), [season])
  const rows = useMemo(() => projectedSeeding(season, picks), [season, picks])
  const clinches = useMemo(() => projectedClinches(season, picks), [season, picks])
  const divisionOf = useMemo(() => {
    const names = new Map((season.divisions ?? []).map((d) => [d.id, d.name]))
    return new Map(season.teams.flatMap((t) => (t.divisionId === undefined ? [] : [[t.memberId, names.get(t.divisionId) ?? ''] as const])))
  }, [season])
  const [view, setView] = useUrlState('view', 'seeds')
  // On a phone, which panel shows; from lg up both always do. With no games left, only the seeds.
  const [panel, setPanel] = useState<Panel>('games')
  const shown: Panel = weeks.length === 0 ? 'seeds' : panel
  const pickedCount = weeks.flatMap((w) => w.fixtures).filter((f) => picks[f.key] !== undefined).length
  const openSeeds = () => {
    setPanel('seeds')
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="space-y-4">
      {weeks.length > 0 && <PanelSwitch panel={shown} onPanel={setPanel} picked={pickedCount} />}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
        <div className={`space-y-4 lg:sticky lg:top-20 ${shown === 'seeds' ? '' : 'max-lg:hidden'}`}>
          <MachineStandings
            rows={rows}
            year={season.year}
            divisions={season.divisions ?? []}
            clinches={clinches}
            heading={weeks.length === 0 ? 'Final seeds' : pickedCount === 0 ? 'Seeds as it stands' : 'Projected seeds'}
            view={view === 'divisions' ? 'divisions' : 'seeds'}
            onView={(v: StandingsView) => setView(v)}
            withPicks={pickedCount > 0}
          />
          <SeedingRules />
        </div>
        {weeks.length > 0 && (
          <div className={shown === 'games' ? '' : 'max-lg:hidden'}>
            <MachineGames
              weeks={weeks}
              year={season.year}
              divisionOf={divisionOf}
              picks={picks}
              onPick={onPick}
              onClear={onClear}
              above={<PlayoffFieldStrip rows={rows} year={season.year} clinches={clinches} onOpen={openSeeds} />}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Pick the winners of the regular-season games still to play and see the playoff seeding that
 * follows, under the league's own rules (selectors/playoffSeeding.ts). Picks are kept per page
 * visit, across leagues: switching tabs doesn't lose them.
 */
export function PlayoffMachine() {
  const tiers = YEAR === '' ? [] : tiersForYear(YEAR)
  const [tierParam, setTier] = useUrlState('tier', 'PREMIER')
  const tier = (tiers.includes(tierParam as Tier) ? tierParam : (tiers[0] ?? 'PREMIER')) as Tier
  const { data: season, loading, error } = useSeason(tier, YEAR, YEAR !== '')
  const [picks, setPicks] = useState<MachinePicks>({})

  // Wider than the site's max-w-5xl column on a large screen: the seeds table and the game picker
  // sit side by side and were cramped at 1024px. Negative margins (as DataTable's fullBleed does)
  // widen it to the window less a 1.5rem gutter each side, capped at 88rem. Phones are unchanged.
  return (
    <div className="space-y-6 lg:mx-[calc(50%-min(50vw-1.5rem,44rem))]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold uppercase tracking-tight">Playoff Machine</h1>
          <p className="max-w-2xl text-sm text-muted">
            Pick the winners of the {YEAR} games still to play and watch the seeding change.
          </p>
        </div>
        {YEAR !== '' && <SeasonLeaguePicker years={[YEAR]} year={YEAR} tier={tier} onYear={() => undefined} onTier={setTier} />}
      </div>
      {YEAR === '' && <p className="text-sm text-muted">There is no season being played right now.</p>}
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} />}
      {season && (
        <MachineContent
          season={season}
          picks={picks}
          onPick={(key, winnerId) => setPicks((prev) => togglePick(prev, key, winnerId))}
          onClear={(keys) => setPicks((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !keys.includes(k))))}
        />
      )}
    </div>
  )
}
