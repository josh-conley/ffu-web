import { useMemo, useState } from 'react'
import { LIVE_LEAGUE_IDS, tiersForYear, type Tier } from '@/config'
import type { SeasonData } from '@/data'
import { useSeason } from '@/hooks/useLeagueData'
import { useUrlState } from '@/hooks/useUrlState'
import { machineWeeks, projectedSeeding, togglePick, type MachinePicks } from '@/selectors'
import { BUTTON } from '@/components/controls'
import { SeasonLeaguePicker } from '@/components/SeasonLeaguePicker'
import { PlayoffSeedTable } from '@/components/playoffs/PlayoffSeedTable'
import { MachineFixtures } from '@/components/playoffs/MachineFixtures'
import { SeedingRules } from '@/components/playoffs/SeedingRules'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

// The season being played: the machine has nothing to say about a finished one.
const YEAR = Object.keys(LIVE_LEAGUE_IDS).sort().at(-1) ?? ''

function MachineContent({ season, picks, onPick, onClear }: {
  season: SeasonData
  picks: MachinePicks
  onPick: (key: string, winnerId: string) => void
  /** Clears this league's picks only (the page keeps every league's). */
  onClear: (keys: readonly string[]) => void
}) {
  const weeks = useMemo(() => machineWeeks(season), [season])
  const rows = useMemo(() => projectedSeeding(season, picks), [season, picks])
  const keys = weeks.flatMap((w) => w.fixtures.map((f) => f.key))
  const pickedCount = keys.filter((k) => picks[k] !== undefined).length

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
      <div className="space-y-4 lg:sticky lg:top-20">
        <section aria-labelledby="machine-seeds" className="space-y-2">
          <h2 id="machine-seeds" className="text-sm font-bold uppercase tracking-wide">
            {weeks.length === 0 ? 'Final seeds' : pickedCount === 0 ? 'Seeds as it stands' : 'Projected seeds'}
          </h2>
          <PlayoffSeedTable rows={rows} year={season.year} divisions={season.divisions ?? []} />
        </section>
        <SeedingRules />
      </div>
      <section aria-labelledby="machine-games" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="machine-games" className="text-sm font-bold uppercase tracking-wide">
            Games to play <span className="font-normal normal-case text-muted">· {pickedCount} of {keys.length} picked</span>
          </h2>
          {pickedCount > 0 && (
            <button type="button" onClick={() => onClear(keys)} className={BUTTON}>
              Clear picks
            </button>
          )}
        </div>
        {weeks.length === 0 ? (
          <p className="text-sm text-muted">The regular season is over: these are the seeds.</p>
        ) : (
          <MachineFixtures weeks={weeks} year={season.year} picks={picks} onPick={onPick} />
        )}
      </section>
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

  return (
    <div className="space-y-6">
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
