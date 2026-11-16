import type { Division } from '@/data'
import type { ClinchStatus, SeedRow } from '@/selectors'
import { segButton } from '../controls'
import { CLINCH } from './clinchMarks'
import { PlayoffSeedTable } from './PlayoffSeedTable'

// The machine's standings: the seeds in one table ("Overall", as Standings names it), or each division's race on its own (ordered by
// place in the division, the seed alongside). The clinch legend sits under either.

export type StandingsView = 'seeds' | 'divisions'

function ClinchLegend({ withPicks }: { withPicks: boolean }) {
  return (
    <p className="text-xs text-muted">
      {Object.values(CLINCH).map(({ mark, label }) => (
        <span key={mark} className="mr-3 inline-block">
          <b className="text-text">{mark}</b> {label.toLowerCase()}
        </span>
      ))}
      <span className="block pt-1">
        {withPicks ? 'Clinches count your picks as played. ' : ''}Marks are certain: tiebreakers never count toward one, so a
        clinch can show a game late. Press H2H or PF to see how a tie was broken.
      </span>
    </p>
  )
}

function ByDivision({ rows, year, divisions, clinches }: { rows: SeedRow[]; year: string; divisions: readonly Division[]; clinches: ReadonlyMap<string, ClinchStatus> }) {
  return (
    <div className="space-y-4">
      {divisions.map((division) => {
        const members = rows.filter((r) => r.divisionId === division.id).sort((a, b) => a.divisionRank - b.divisionRank)
        return (
          <section key={division.id} aria-label={`${division.name} division`}>
            <h3 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text">
              <span className="inline-block h-3.5 w-1 bg-accent" aria-hidden />
              {division.name}
            </h3>
            <PlayoffSeedTable rows={members} year={year} divisions={divisions} clinches={clinches} caption={`${division.name} division, in division order`} cutLine={false} />
          </section>
        )
      })}
    </div>
  )
}

export function MachineStandings({ rows, year, divisions, clinches, heading, view, onView, withPicks }: {
  rows: SeedRow[]
  year: string
  divisions: readonly Division[]
  clinches: ReadonlyMap<string, ClinchStatus>
  heading: string
  view: StandingsView
  onView: (view: StandingsView) => void
  withPicks: boolean
}) {
  const byDivision = view === 'divisions' && divisions.length > 0
  return (
    <section aria-labelledby="machine-seeds" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="machine-seeds" className="text-sm font-bold uppercase tracking-wide">
          {heading}
        </h2>
        {divisions.length > 0 && (
          <div className="flex gap-1" role="group" aria-label="Standings view">
            <button type="button" aria-pressed={!byDivision} onClick={() => onView('seeds')} className={segButton(!byDivision)}>
              Overall
            </button>
            <button type="button" aria-pressed={byDivision} onClick={() => onView('divisions')} className={segButton(byDivision)}>
              By division
            </button>
          </div>
        )}
      </div>
      {byDivision ? (
        <ByDivision rows={rows} year={year} divisions={divisions} clinches={clinches} />
      ) : (
        <PlayoffSeedTable rows={rows} year={year} divisions={divisions} clinches={clinches} caption="Projected playoff seeds; the line marks the last team in" />
      )}
      <ClinchLegend withPicks={withPicks} />
    </section>
  )
}
