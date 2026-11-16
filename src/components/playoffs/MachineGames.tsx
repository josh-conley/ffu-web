import type { ReactNode } from 'react'
import type { MachinePicks, MachineWeek } from '@/selectors'
import { BUTTON } from '../controls'
import { MachineFixtures } from './MachineFixtures'

// The machine's games panel: the count, the clear button and the week-by-week picker. `above`
// renders between the heading and the games (the phone's playoff-field strip).

export function MachineGames({ weeks, year, divisionOf, picks, onPick, onClear, above }: {
  weeks: readonly MachineWeek[]
  year: string
  divisionOf: ReadonlyMap<string, string>
  picks: MachinePicks
  onPick: (key: string, winnerId: string) => void
  onClear: (keys: readonly string[]) => void
  above?: ReactNode
}) {
  const keys = weeks.flatMap((w) => w.fixtures.map((f) => f.key))
  const pickedCount = keys.filter((k) => picks[k] !== undefined).length
  return (
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
      {above}
      <MachineFixtures weeks={weeks} year={year} divisionOf={divisionOf} picks={picks} onPick={onPick} />
    </section>
  )
}
